package client

import (
	"context"
	"sync"

	"github.com/river-build/river/core/node/dlog"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

type (
	StreamsSyncer interface {
		Run()
		Address() common.Address
		AddStream(ctx context.Context, cookie *SyncCookie) error
		RemoveStream(ctx context.Context, streamID StreamId) (bool, error)
	}

	DebugStreamsSyncer interface {
		DebugDropStream(ctx context.Context, streamID StreamId) (bool, error)
	}

	// SyncerSet is the set of StreamsSyncers that are used for a sync operation.
	SyncerSet struct {
		// ctx is the root context for all syncers in this set and used to cancel them
		ctx context.Context
		// globalSyncOpCtxCancel cancels ctx
		globalSyncOpCtxCancel context.CancelCauseFunc
		// syncID is the sync id as used between the client and this node
		syncID string
		// localNodeAddress is the node address for this stream node instance
		localNodeAddress common.Address
		// messages is the channel to which StreamsSyncers write updates that must be sent to the client
		messages chan *SyncStreamsResponse
		// streamCache is used to subscribe to streams managed by this node instance
		streamCache events.StreamCache
		// nodeRegistry keeps a mapping from node address to node meta-data
		nodeRegistry nodes.NodeRegistry
		// syncerTasks is a wait group for running background StreamsSyncers that is used to ensure all syncers stopped
		syncerTasks sync.WaitGroup
		// muSyncers guards syncers and streamID2Syncer
		muSyncers sync.Mutex
		// stopped holds an indication if the sync operation is stopped
		stopped bool
		// syncers is the existing set of syncers, indexed by the syncer node address
		syncers map[common.Address]StreamsSyncer
		// streamID2Syncer maps from a stream to its syncer
		streamID2Syncer map[StreamId]StreamsSyncer
	}

	// SyncCookieSet maps from a stream id to a sync cookie
	SyncCookieSet map[StreamId]*SyncCookie
	// StreamCookieSetGroupedByNodeAddress is a mapping from a node address to a SyncCookieSet
	StreamCookieSetGroupedByNodeAddress map[common.Address]SyncCookieSet
)

var (
	_ StreamsSyncer      = (*localSyncer)(nil)
	_ DebugStreamsSyncer = (*localSyncer)(nil)

	_ StreamsSyncer      = (*remoteSyncer)(nil)
	_ DebugStreamsSyncer = (*remoteSyncer)(nil)
)

func (cs SyncCookieSet) AsSlice() []*SyncCookie {
	cookies := make([]*SyncCookie, 0, len(cs))
	for _, cookie := range cs {
		cookies = append(cookies, cookie)
	}
	return cookies
}

// NewSyncers creates the required syncer set that subscribe on all given cookies.
// A syncer can either be local or remote and writes received events to an internal messages channel from which events
// are streamed to the client.
func NewSyncers(
	ctx context.Context,
	globalSyncOpCtxCancel context.CancelCauseFunc,
	syncID string,
	streamCache events.StreamCache,
	nodeRegistry nodes.NodeRegistry,
	localNodeAddress common.Address,
	cookies StreamCookieSetGroupedByNodeAddress,
) (*SyncerSet, <-chan *SyncStreamsResponse, error) {
	var (
		log             = dlog.FromCtx(ctx)
		syncers         = make(map[common.Address]StreamsSyncer)
		streamID2Syncer = make(map[StreamId]StreamsSyncer)
		messages        = make(chan *SyncStreamsResponse, 256)
		ss              = &SyncerSet{
			ctx:                   ctx,
			globalSyncOpCtxCancel: globalSyncOpCtxCancel,
			syncID:                syncID,
			streamCache:           streamCache,
			nodeRegistry:          nodeRegistry,
			localNodeAddress:      localNodeAddress,
			syncers:               syncers,
			streamID2Syncer:       streamID2Syncer,
			messages:              messages,
		}

		// report these streams as down
		unavailableRemote = func(cookieSet SyncCookieSet) {
			for _, cookie := range cookieSet.AsSlice() {
				select {
				case messages <- &SyncStreamsResponse{
					SyncOp:   SyncOp_SYNC_DOWN,
					StreamId: cookie.GetStreamId(),
				}:
					continue
				case <-ctx.Done():
					return
				}
			}
		}
	)

	// instantiate background syncers for sync operation
	for nodeAddress, cookieSet := range cookies {
		if nodeAddress == localNodeAddress { // stream managed by this node
			syncer, err := newLocalSyncer(
				ctx, syncID, globalSyncOpCtxCancel, localNodeAddress, streamCache, cookieSet.AsSlice(), messages)
			if err != nil {
				return nil, nil, err
			}
			syncers[nodeAddress] = syncer
		} else {
			client, err := nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
			if err != nil {
				log.Warn("Unable to find client for remote stream sync",
					"err", err, "remoteNode", nodeAddress)
				go unavailableRemote(cookieSet)
				continue
			}

			syncer, err := newRemoteSyncer(
				ctx, globalSyncOpCtxCancel, syncID, nodeAddress, client, cookieSet.AsSlice(), ss.rmStream, messages)
			if err != nil {
				log.Warn("Unable to connect to remote stream when starting stream sync",
					"err", err, "remoteNode", nodeAddress)
				go unavailableRemote(cookieSet)
				continue
			}

			syncers[nodeAddress] = syncer
		}

		// associate syncer with streamId to remove stream from sync operation
		syncer := syncers[nodeAddress]
		for streamID := range cookieSet {
			streamID2Syncer[streamID] = syncer
		}
	}

	return ss, messages, nil
}

func (ss *SyncerSet) Run() {
	<-ss.ctx.Done() // sync cancelled by client, client conn dropped or client send buffer full

	ss.muSyncers.Lock()
	ss.stopped = true
	ss.muSyncers.Unlock()

	ss.syncerTasks.Wait() // background syncers finished -> safe to close messages channel
	close(ss.messages)    // close will cause the sync operation to send the SYNC_CLOSE message to the client
}

func (ss *SyncerSet) AddInitialStreams() {
	ss.muSyncers.Lock()
	for _, syncer := range ss.syncers {
		ss.startSyncer(syncer)
	}
	ss.muSyncers.Unlock()
}

func (ss *SyncerSet) AddStream(
	ctx context.Context,
	nodeAddress common.Address,
	streamID StreamId,
	cookie *SyncCookie,
) error {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	if ss.stopped {
		return RiverError(Err_CANCELED, "Sync operation stopped", "syncId", ss.syncID)
	}

	if _, found := ss.streamID2Syncer[streamID]; found {
		return nil // stream is already part of sync operation
	}

	// check if there is already a syncer that can sync the given stream -> add stream to the syncer
	if syncer, found := ss.syncers[nodeAddress]; found {
		if err := syncer.AddStream(ctx, cookie); err != nil {
			return err
		}
		ss.streamID2Syncer[streamID] = syncer
		return nil
	}

	// first stream to sync with remote -> create a new syncer instance
	var (
		syncer StreamsSyncer
		err    error
	)
	if nodeAddress == ss.localNodeAddress {
		if syncer, err = newLocalSyncer(
			ss.ctx, ss.syncID, ss.globalSyncOpCtxCancel, ss.localNodeAddress,
			ss.streamCache, []*SyncCookie{cookie}, ss.messages); err != nil {
			return err
		}
	} else {
		client, err := ss.nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
		if err != nil {
			return err
		}
		if syncer, err = newRemoteSyncer(
			ss.ctx, ss.globalSyncOpCtxCancel, ss.syncID, nodeAddress, client,
			[]*SyncCookie{cookie}, ss.rmStream, ss.messages); err != nil {
			return err
		}
	}

	ss.syncers[nodeAddress] = syncer
	ss.streamID2Syncer[streamID] = syncer
	ss.startSyncer(syncer)

	return nil
}

// caller must have ss.muSyncers claimed
func (ss *SyncerSet) startSyncer(syncer StreamsSyncer) {
	ss.syncerTasks.Add(1)
	go func() {
		syncer.Run()
		ss.syncerTasks.Done()
		ss.muSyncers.Lock()
		delete(ss.syncers, syncer.Address())
		ss.muSyncers.Unlock()
	}()
}

func (ss *SyncerSet) RemoveStream(ctx context.Context, streamID StreamId) error {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	// get the syncer that is responsible for the stream.
	// (if not it indicates state corruption between ss.streamID2Syncer and ss.syncers)
	syncer, found := ss.streamID2Syncer[streamID]
	if !found {
		return RiverError(Err_NOT_FOUND, "Stream not part of sync operation").
			Tags("syncId", ss.syncID, "streamId", streamID)
	}

	syncerStopped, err := syncer.RemoveStream(ctx, streamID)
	if err != nil {
		return err
	}

	delete(ss.streamID2Syncer, streamID)
	if syncerStopped {
		delete(ss.syncers, syncer.Address())
	}

	return nil
}

func (ss *SyncerSet) DebugDropStream(ctx context.Context, streamID StreamId) error {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	syncer, found := ss.streamID2Syncer[streamID]
	if !found {
		return RiverError(Err_NOT_FOUND, "Stream not part of sync operation").
			Tags("syncId", ss.syncID, "streamId", streamID)
	}

	debugSyncer, ok := syncer.(DebugStreamsSyncer)
	if !ok {
		return RiverError(Err_UNAVAILABLE,
			"Syncer responsible for stream doesn't support debug drop stream").
			Tags("syncId", ss.syncID, "streamId", streamID)
	}

	syncerStopped, err := debugSyncer.DebugDropStream(ctx, streamID)
	if err != nil {
		return err
	}

	delete(ss.streamID2Syncer, streamID)
	if syncerStopped {
		delete(ss.syncers, syncer.Address())
	}

	return nil
}

// ValidateAndGroupSyncCookies validates the given syncCookies and groups them by node address/streamID.
func ValidateAndGroupSyncCookies(syncCookies []*SyncCookie) (StreamCookieSetGroupedByNodeAddress, error) {
	cookies := make(StreamCookieSetGroupedByNodeAddress)
	for _, cookie := range syncCookies {
		if err := events.SyncCookieValidate(cookie); err != nil {
			return nil, err
		}

		streamID, err := StreamIdFromBytes(cookie.GetStreamId())
		if err != nil {
			return nil, err
		}

		nodeAddr := common.BytesToAddress(cookie.NodeAddress)
		if cookies[nodeAddr] == nil {
			cookies[nodeAddr] = make(map[StreamId]*SyncCookie)
		}
		cookies[nodeAddr][streamID] = cookie
	}
	return cookies, nil
}

func (ss *SyncerSet) rmStream(streamID StreamId) {
	ss.muSyncers.Lock()
	delete(ss.streamID2Syncer, streamID)
	ss.muSyncers.Unlock()
}
