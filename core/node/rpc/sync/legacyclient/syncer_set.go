package legacyclient

import (
	"context"
	"slices"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
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
		syncers map[common.Address]client.StreamsSyncer
		// streamID2Syncer maps from a stream to its syncer
		streamID2Syncer map[StreamId]client.StreamsSyncer
		// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
		otelTracer trace.Tracer
	}
)

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
	otelTracer trace.Tracer,
) (*SyncerSet, *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]) {
	ss := &SyncerSet{
		ctx:                   ctx,
		globalSyncOpCtxCancel: globalSyncOpCtxCancel,
		syncID:                syncID,
		streamCache:           streamCache,
		nodeRegistry:          nodeRegistry,
		localNodeAddress:      localNodeAddress,
		syncers:               make(map[common.Address]client.StreamsSyncer),
		streamID2Syncer:       make(map[StreamId]client.StreamsSyncer),
		messages:              dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		otelTracer:            otelTracer,
	}
	return ss, ss.messages
}

func (ss *SyncerSet) Run() {
	<-ss.ctx.Done() // sync cancelled by client, client conn dropped or client send buffer full

	ss.muSyncers.Lock()
	ss.stopped = true
	ss.muSyncers.Unlock()

	ss.syncerTasks.Wait() // background syncers finished -> safe to close messages channel
}

// SyncingStreamsCount returns the number of streams that are currently being synced by this syncer set.
func (ss *SyncerSet) SyncingStreamsCount() int {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	return len(ss.streamID2Syncer)
}

// Modify splits the given request into add and remove operations and forwards them to the responsible syncers.
func (ss *SyncerSet) Modify(ctx context.Context, req client.ModifyRequest) error {
	if ss.otelTracer != nil {
		var span trace.Span
		ctx, span = ss.otelTracer.Start(ctx, "Modify",
			trace.WithAttributes(attribute.String("syncID", ss.syncID)))
		defer span.End()
	}

	// Validate modify request
	if err := req.Validate(); err != nil {
		return AsRiverError(err, Err_INVALID_ARGUMENT).Tag("syncId", ss.syncID)
	}

	addingFailuresLock := sync.Mutex{}
	addingFailures := make([]*SyncStreamOpStatus, 0, len(req.ToAdd))
	addingFailuresHandler := func(status *SyncStreamOpStatus) {
		if status.GetCode() != int32(Err_NOT_FOUND) && status.GetCode() != int32(Err_INTERNAL) {
			req.AddingFailureHandler(status)
			return
		}

		addingFailuresLock.Lock()
		addingFailures = append(addingFailures, status)
		addingFailuresLock.Unlock()
	}

	// First attempt with the provided cookies without modifications.
	if err := ss.modify(ctx, client.ModifyRequest{
		ToAdd:                  req.ToAdd,
		ToRemove:               req.ToRemove,
		AddingFailureHandler:   addingFailuresHandler,
		RemovingFailureHandler: req.RemovingFailureHandler,
	}); err != nil {
		return err
	}

	// If a stream was failed to add, try to fix the cookies and send the modify sync again.
	// There could be a case when a client specifies a wrong node address which leads to errors.
	// This case should be properly handled by resetting the node address and retrying the operation.
	if len(addingFailures) == 0 {
		return nil
	}

	mr := client.ModifyRequest{
		ToAdd:                make([]*SyncCookie, 0, len(addingFailures)),
		AddingFailureHandler: req.AddingFailureHandler,
	}

	// Remove node addresses from failed to add streams
	for _, status := range addingFailures {
		preparedSyncCookie := &SyncCookie{
			StreamId: status.StreamId,
		}
		for _, cookie := range req.ToAdd {
			if StreamId(cookie.GetStreamId()) == StreamId(status.StreamId) {
				preparedSyncCookie = cookie
				break
			}
		}
		preparedSyncCookie.NodeAddress = nil
		mr.ToAdd = append(mr.ToAdd, preparedSyncCookie)
	}

	return ss.modify(ctx, mr)
}

// modify splits the given request into add and remove operations and forwards them to the responsible syncers.
func (ss *SyncerSet) modify(ctx context.Context, req client.ModifyRequest) error {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	if len(req.ToAdd) > 0 && ss.stopped {
		return RiverError(Err_CANCELED, "Sync operation stopped", "syncId", ss.syncID)
	}

	modifySyncs := make(map[common.Address]*ModifySyncRequest)

	// Group modify sync request by the remote syncer.
	// Identifying which node to use for the given streams.
	for _, cookie := range req.ToAdd {
		streamID := StreamId(cookie.GetStreamId())
		if _, found := ss.streamID2Syncer[streamID]; found {
			continue
		}

		selectedNode, nodeAvailable := ss.selectNodeForStream(ctx, cookie)
		if !nodeAvailable {
			req.AddingFailureHandler(&SyncStreamOpStatus{
				StreamId: streamID[:],
				Code:     int32(Err_UNAVAILABLE),
				Message:  "No available node to sync stream",
			})
			continue
		}

		if _, ok := modifySyncs[selectedNode]; !ok {
			modifySyncs[selectedNode] = &ModifySyncRequest{}
		}

		modifySyncs[selectedNode].AddStreams = append(
			modifySyncs[selectedNode].AddStreams,
			cookie.CopyWithAddr(selectedNode),
		)
	}

	// Group remove sync request by the remote syncer.
	// Identifying which node to use for the given streams to remove from sync.
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

		modifySyncs[syncer.Address()].RemoveStreams = append(
			modifySyncs[syncer.Address()].RemoveStreams,
			streamIDRaw,
		)
	}

	if len(modifySyncs) > 0 {
		ss.distributeSyncModifications(ctx, modifySyncs, req.AddingFailureHandler, req.RemovingFailureHandler)
	}

	return nil
}

// distributeSyncModifications distributes the given modify sync requests to the responsible syncers.
func (ss *SyncerSet) distributeSyncModifications(
	ctx context.Context,
	modifySyncs map[common.Address]*ModifySyncRequest,
	failedToAdd func(status *SyncStreamOpStatus),
	failedToRemove func(status *SyncStreamOpStatus),
) {
	var wg sync.WaitGroup
	var localMuSyncers sync.Mutex
	for nodeAddress, modifySync := range modifySyncs {
		// Get syncer for the given node address
		syncer, err := ss.getOrCreateSyncerNoLock(nodeAddress)
		if err != nil {
			rvrErr := AsRiverError(err).Tag("remoteSyncerAddr", nodeAddress)
			for _, cookie := range modifySync.GetAddStreams() {
				failedToAdd(&SyncStreamOpStatus{
					StreamId: cookie.GetStreamId(),
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
			}
			for _, streamIDRaw := range modifySync.GetRemoveStreams() {
				failedToRemove(&SyncStreamOpStatus{
					StreamId: streamIDRaw,
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
			}
			continue
		}

		wg.Add(1)
		go func(modifySync *ModifySyncRequest) {
			defer wg.Done()

			ctx, cancel := context.WithTimeout(ctx, time.Second*20)
			defer cancel()

			resp, syncerStopped, err := syncer.Modify(ctx, modifySync)
			if err != nil {
				rvrErr := AsRiverError(err, Err_INTERNAL).Tag("remoteSyncerAddr", syncer.Address())
				for _, cookie := range modifySync.GetAddStreams() {
					failedToAdd(&SyncStreamOpStatus{
						StreamId: cookie.GetStreamId(),
						Code:     int32(rvrErr.Code),
						Message:  rvrErr.GetMessage(),
					})
				}
				for _, streamIDRaw := range modifySync.GetRemoveStreams() {
					failedToRemove(&SyncStreamOpStatus{
						StreamId: streamIDRaw,
						Code:     int32(rvrErr.Code),
						Message:  rvrErr.GetMessage(),
					})
				}
				return
			}

			addingFailures := resp.GetAdds()
			successfullyAdded := slices.DeleteFunc(modifySync.GetAddStreams(), func(cookie *SyncCookie) bool {
				return slices.ContainsFunc(addingFailures, func(status *SyncStreamOpStatus) bool {
					return StreamId(status.StreamId) == StreamId(cookie.GetStreamId())
				})
			})
			for _, status := range addingFailures {
				failedToAdd(status)
			}

			removalFailures := resp.GetRemovals()
			successfullyRemoved := slices.DeleteFunc(modifySync.GetRemoveStreams(), func(streamIdRaw []byte) bool {
				return slices.ContainsFunc(removalFailures, func(status *SyncStreamOpStatus) bool {
					return StreamId(status.StreamId) == StreamId(streamIdRaw)
				})
			})
			for _, status := range removalFailures {
				failedToRemove(status)
			}

			localMuSyncers.Lock()
			for _, cookie := range successfullyAdded {
				ss.streamID2Syncer[StreamId(cookie.GetStreamId())] = syncer
			}
			for _, streamIdRaw := range successfullyRemoved {
				delete(ss.streamID2Syncer, StreamId(streamIdRaw))
			}
			if syncerStopped {
				delete(ss.syncers, syncer.Address())
			}
			localMuSyncers.Unlock()
		}(modifySync)
	}
	wg.Wait()
}

func (ss *SyncerSet) DebugDropStream(ctx context.Context, streamID StreamId) error {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	syncer, found := ss.streamID2Syncer[streamID]
	if !found {
		return RiverError(Err_NOT_FOUND, "Stream not part of sync operation").
			Tags("syncId", ss.syncID, "streamId", streamID)
	}

	syncerStopped, err := syncer.DebugDropStream(ctx, streamID)
	if err != nil {
		return err
	}

	delete(ss.streamID2Syncer, streamID)
	if syncerStopped {
		delete(ss.syncers, syncer.Address())
	}

	return nil
}

// selectNodeForStream attempts to find an available node for the given stream in the following order:
// 1. Node specified in the cookie (if any)
// 2. Local node (if stream is local)
// 3. Remote nodes (in order of preference)
// Returns the selected node address and true if a node was found and available, false otherwise.
// Initializes syncer for the selected node if it does not exist yet.
func (ss *SyncerSet) selectNodeForStream(ctx context.Context, cookie *SyncCookie) (common.Address, bool) {
	streamID := StreamId(cookie.GetStreamId())

	// 1. Try node from cookie first
	if addrRaw := cookie.GetNodeAddress(); len(addrRaw) > 0 {
		selectedNode := common.BytesToAddress(addrRaw)
		if _, err := ss.getOrCreateSyncerNoLock(selectedNode); err == nil {
			return selectedNode, true
		}
	}

	stream, err := ss.streamCache.GetStreamNoWait(ctx, streamID)
	if err != nil {
		return common.Address{}, false
	}

	// 2. Try local node if stream is local
	remotes, isLocal := stream.GetRemotesAndIsLocal()
	if isLocal {
		if _, err = ss.getOrCreateSyncerNoLock(ss.localNodeAddress); err == nil {
			return ss.localNodeAddress, true
		}
	}

	// 3. Try remote nodes
	if len(remotes) > 0 {
		selectedNode := stream.GetStickyPeer()
		for range remotes {
			if _, err = ss.getOrCreateSyncerNoLock(selectedNode); err == nil {
				return selectedNode, true
			}
			selectedNode = stream.AdvanceStickyPeer(selectedNode)
		}
	}

	return common.Address{}, false
}

// getOrCreateSyncerNoLock returns the syncer for the given node address.
// If the syncer does not exist, it creates a new one and starts it.
func (ss *SyncerSet) getOrCreateSyncerNoLock(nodeAddress common.Address) (client.StreamsSyncer, error) {
	if syncer, found := ss.syncers[nodeAddress]; found {
		return syncer, nil
	}

	var syncer client.StreamsSyncer

	if nodeAddress == ss.localNodeAddress {
		syncer = newLocalSyncer(
			ss.ctx,
			ss.syncID,
			ss.globalSyncOpCtxCancel,
			ss.localNodeAddress,
			ss.streamCache,
			ss.messages,
			ss.otelTracer,
		)
	} else {
		client, err := ss.nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
		if err != nil {
			return nil, AsRiverError(err).Tag("remoteSyncerAddr", nodeAddress)
		}

		syncer, err = newRemoteSyncer(
			ss.ctx,
			ss.globalSyncOpCtxCancel,
			ss.syncID,
			nodeAddress,
			client,
			ss.rmStream,
			ss.messages,
			ss.otelTracer,
		)
		if err != nil {
			return nil, AsRiverError(err).Tag("remoteSyncerAddr", nodeAddress)
		}
	}

	ss.syncers[nodeAddress] = syncer
	ss.syncerTasks.Add(1)
	go func() {
		syncer.Run()
		ss.syncerTasks.Done()
		ss.muSyncers.Lock()
		delete(ss.syncers, syncer.Address())
		ss.muSyncers.Unlock()
	}()

	return syncer, nil
}

func (ss *SyncerSet) rmStream(streamID StreamId) {
	ss.muSyncers.Lock()
	delete(ss.streamID2Syncer, streamID)
	ss.muSyncers.Unlock()
}
