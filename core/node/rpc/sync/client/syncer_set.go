package client

import (
	"context"
	"slices"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	"golang.org/x/sync/errgroup"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
	StreamsSyncer interface {
		Run()
		Address() common.Address
		AddStream(ctx context.Context, cookie *SyncCookie) error
		RemoveStream(ctx context.Context, streamID StreamId) (bool, error)
		Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error)
	}

	DebugStreamsSyncer interface {
		DebugDropStream(ctx context.Context, streamID StreamId) (bool, error)
	}

	ModifyRequest struct {
		ToAdd                  []*SyncCookie
		ToRemove               [][]byte
		AddingFailureHandler   func(status *SyncStreamOpStatus)
		RemovingFailureHandler func(status *SyncStreamOpStatus)
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
		messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
		// streamCache is used to subscribe to streams managed by this node instance
		streamCache *StreamCache
		// nodeRegistry keeps a mapping from node address to node meta-data
		nodeRegistry nodes.NodeRegistry
		// syncerTasks is a wait group for running background StreamsSyncers that is used to ensure all syncers stopped
		syncerTasks sync.WaitGroup
		// muSyncers guards syncers and streamID2Syncer
		muSyncers deadlock.Mutex
		// stopped holds an indication if the sync operation is stopped
		stopped bool
		// syncers is the existing set of syncers, indexed by the syncer node address
		syncers map[common.Address]StreamsSyncer
		// streamID2Syncer maps from a stream to its syncer
		streamID2Syncer map[StreamId]StreamsSyncer
		// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
		otelTracer trace.Tracer
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
	streamCache *StreamCache,
	nodeRegistry nodes.NodeRegistry,
	localNodeAddress common.Address,
	cookies StreamCookieSetGroupedByNodeAddress,
	otelTracer trace.Tracer,
) (*SyncerSet, *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse], error) {
	var (
		log             = logging.FromCtx(ctx)
		syncers         = make(map[common.Address]StreamsSyncer)
		streamID2Syncer = make(map[StreamId]StreamsSyncer)
		messages        = dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
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
			otelTracer:            otelTracer,
		}

		// report these streams as down
		unavailableRemote = func(cookieSet SyncCookieSet) {
			for _, cookie := range cookieSet.AsSlice() {
				select {
				case <-ctx.Done():
					return
				default:
					_ = messages.AddMessage(&SyncStreamsResponse{
						SyncOp:   SyncOp_SYNC_DOWN,
						StreamId: cookie.GetStreamId(),
					})
				}
			}
		}
	)

	// instantiate background syncers for sync operation
	for nodeAddress, cookieSet := range cookies {
		if nodeAddress == localNodeAddress { // stream managed by this node
			syncer, err := ss.newLocalSyncer(cookieSet.AsSlice())
			if err != nil {
				return nil, nil, err
			}
			syncers[nodeAddress] = syncer
		} else {
			syncer, err := ss.newRemoteSyncer(nodeAddress, cookieSet.AsSlice())
			if err != nil {
				log.Warnw("Unable to create remote syncer",
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
}

func (ss *SyncerSet) AddStream(
	ctx context.Context,
	nodeAddress common.Address,
	streamID StreamId,
	cookie *SyncCookie,
) error {
	if ss.otelTracer != nil {
		_, span := ss.otelTracer.Start(ctx, "AddStream",
			trace.WithAttributes(attribute.String("stream", streamID.String())),
			trace.WithAttributes(attribute.String("remoteSyncID", ss.syncID)))
		defer span.End()
	}

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
		var span trace.Span
		if ss.otelTracer != nil {
			_, span = ss.otelTracer.Start(ctx, "NewLocalSyncer",
				trace.WithAttributes(attribute.String("stream", streamID.String())))
		}
		if syncer, err = newLocalSyncer(
			ss.ctx, ss.syncID, ss.globalSyncOpCtxCancel, ss.localNodeAddress,
			ss.streamCache, []*SyncCookie{cookie}, ss.messages, ss.otelTracer); err != nil {
			if span != nil {
				span.End()
			}
			return err
		}
		if span != nil {
			span.End()
		}
	} else {
		client, err := ss.nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
		if err != nil {
			return err
		}
		var span trace.Span
		if ss.otelTracer != nil {
			_, span = ss.otelTracer.Start(ctx, "NewRemoteSyncer",
				trace.WithAttributes(attribute.String("stream", streamID.String()),
					attribute.String("remote", nodeAddress.String())))
		}
		if syncer, err = newRemoteSyncer(
			ss.ctx, ss.globalSyncOpCtxCancel, ss.syncID, nodeAddress, client,
			[]*SyncCookie{cookie}, ss.rmStream, ss.messages, ss.otelTracer); err != nil {
			if span != nil {
				span.End()
			}
			return err
		}
		if span != nil {
			span.End()
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

// Modify splits the given request into add and remove operations and forwards them to the responsible syncers.
func (ss *SyncerSet) Modify(ctx context.Context, req ModifyRequest) error {
	if len(req.ToAdd) > 0 && ss.stopped {
		return RiverError(Err_CANCELED, "Sync operation stopped", "syncId", ss.syncID)
	}

	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	modifySyncs := make(map[common.Address]*ModifySyncRequest)

	// group cookies by node address
	for _, cookie := range req.ToAdd {
		if _, found := ss.streamID2Syncer[StreamId(cookie.GetStreamId())]; found {
			continue
		}

		nodeAddress := common.BytesToAddress(cookie.GetNodeAddress())
		if _, ok := modifySyncs[nodeAddress]; !ok {
			modifySyncs[nodeAddress] = &ModifySyncRequest{}
		}
		modifySyncs[nodeAddress].AddStreams = append(modifySyncs[nodeAddress].AddStreams, cookie)
	}

	// group streamIDs by node address
	for _, streamIDRaw := range req.ToRemove {
		syncer, found := ss.streamID2Syncer[StreamId(streamIDRaw)]
		if !found {
			req.RemovingFailureHandler(&SyncStreamOpStatus{
				StreamId: streamIDRaw,
				Code:     int32(Err_NOT_FOUND),
				Message:  "Stream not part of sync operation",
			})
			continue
		}

		if _, ok := modifySyncs[syncer.Address()]; !ok {
			modifySyncs[syncer.Address()] = &ModifySyncRequest{}
		}
		modifySyncs[syncer.Address()].RemoveStreams = append(modifySyncs[syncer.Address()].RemoveStreams, streamIDRaw)
	}

	if len(modifySyncs) == 0 {
		return nil
	}

	var errGrp errgroup.Group

	for nodeAddress, modifySync := range modifySyncs {
		// check if there is already a syncer that can sync the given stream -> add stream to the syncer
		syncer, found := ss.syncers[nodeAddress]
		if !found {
			// first stream to sync with remote -> create a new syncer instance
			var err error
			if nodeAddress == ss.localNodeAddress {
				syncer, err = ss.newLocalSyncer(nil)
			} else {
				syncer, err = ss.newRemoteSyncer(nodeAddress, nil)
			}
			if err != nil {
				rvrErr := AsRiverError(err)

				for _, cookie := range modifySync.GetAddStreams() {
					req.AddingFailureHandler(&SyncStreamOpStatus{
						StreamId: cookie.GetStreamId(),
						Code:     int32(rvrErr.Code),
						Message:  rvrErr.GetMessage(),
					})
				}

				for _, streamIDRaw := range modifySync.GetRemoveStreams() {
					req.RemovingFailureHandler(&SyncStreamOpStatus{
						StreamId: streamIDRaw,
						Code:     int32(rvrErr.Code),
						Message:  rvrErr.GetMessage(),
					})
				}

				continue
			}

			ss.syncers[nodeAddress] = syncer
			ss.startSyncer(syncer)
		}

		errGrp.Go(func() error {
			resp, syncerStopped, err := syncer.Modify(ctx, modifySync)
			if err != nil {
				return err
			}

			addingFailures := resp.GetAdds()
			successfullyAdded := slices.DeleteFunc(modifySync.GetAddStreams(), func(cookie *SyncCookie) bool {
				return slices.ContainsFunc(addingFailures, func(status *SyncStreamOpStatus) bool {
					return StreamId(status.StreamId) == StreamId(cookie.GetStreamId())
				})
			})

			for _, status := range addingFailures {
				req.AddingFailureHandler(status)
			}
			for _, cookie := range successfullyAdded {
				ss.streamID2Syncer[StreamId(cookie.GetStreamId())] = syncer
			}

			removalFailures := resp.GetRemovals()
			successfullyRemoved := slices.DeleteFunc(modifySync.GetRemoveStreams(), func(streamIdRaw []byte) bool {
				return slices.ContainsFunc(removalFailures, func(status *SyncStreamOpStatus) bool {
					return StreamId(status.StreamId) == StreamId(streamIdRaw)
				})
			})

			for _, status := range resp.GetRemovals() {
				req.RemovingFailureHandler(status)
			}
			for _, streamIdRaw := range successfullyRemoved {
				delete(ss.streamID2Syncer, StreamId(streamIdRaw))
			}

			if syncerStopped {
				delete(ss.syncers, syncer.Address())
			}

			return nil
		})
	}

	return errGrp.Wait()
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

func (ss *SyncerSet) rmStream(streamID StreamId) {
	ss.muSyncers.Lock()
	delete(ss.streamID2Syncer, streamID)
	ss.muSyncers.Unlock()
}

func (ss *SyncerSet) newLocalSyncer(cookies []*SyncCookie) (*localSyncer, error) {
	return newLocalSyncer(
		ss.ctx, ss.syncID, ss.globalSyncOpCtxCancel, ss.localNodeAddress,
		ss.streamCache, cookies, ss.messages, ss.otelTracer)
}

func (ss *SyncerSet) newRemoteSyncer(addr common.Address, cookies []*SyncCookie) (*remoteSyncer, error) {
	client, err := ss.nodeRegistry.GetStreamServiceClientForAddress(addr)
	if err != nil {
		return nil, err
	}

	return newRemoteSyncer(
		ss.ctx, ss.globalSyncOpCtxCancel, ss.syncID, addr, client,
		cookies, ss.rmStream, ss.messages, ss.otelTracer)
}
