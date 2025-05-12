package client

import (
	"context"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
	StreamsSyncer interface {
		Run()
		Address() common.Address
		Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error)
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
		// stopped holds an indication if the sync operation is stopped
		stopped uint32
		// syncers is the existing set of syncers, indexed by the syncer node address
		syncers *xsync.Map[common.Address, StreamsSyncer]
		// streamID2Syncer maps from a stream to its syncer
		streamID2Syncer *xsync.Map[StreamId, StreamsSyncer]
		// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
		otelTracer trace.Tracer
	}

	// SyncCookieSet maps from a stream id to a sync cookie
	SyncCookieSet map[StreamId]*SyncCookie
)

var (
	_ StreamsSyncer = (*localSyncer)(nil)
	_ StreamsSyncer = (*remoteSyncer)(nil)
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
	otelTracer trace.Tracer,
) (*SyncerSet, *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]) {
	ss := &SyncerSet{
		ctx:                   ctx,
		globalSyncOpCtxCancel: globalSyncOpCtxCancel,
		syncID:                syncID,
		streamCache:           streamCache,
		nodeRegistry:          nodeRegistry,
		localNodeAddress:      localNodeAddress,
		syncers:               xsync.NewMap[common.Address, StreamsSyncer](),
		streamID2Syncer:       xsync.NewMap[StreamId, StreamsSyncer](),
		messages:              dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		otelTracer:            otelTracer,
	}
	return ss, ss.messages
}

func (ss *SyncerSet) Run() {
	<-ss.ctx.Done() // sync cancelled by client, client conn dropped or client send buffer full
	atomic.StoreUint32(&ss.stopped, 1)
	ss.syncerTasks.Wait() // background syncers finished -> safe to close messages channel
}

// Modify splits the given request into add and remove operations and forwards them to the responsible syncers.
func (ss *SyncerSet) Modify(ctx context.Context, req ModifyRequest) error {
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
	if err := ss.modify(ctx, ModifyRequest{
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

	mr := ModifyRequest{
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
func (ss *SyncerSet) modify(ctx context.Context, req ModifyRequest) error {
	if len(req.ToAdd) > 0 && atomic.LoadUint32(&ss.stopped) == 1 {
		return RiverError(Err_CANCELED, "Sync operation stopped", "syncId", ss.syncID)
	}

	modifySyncs := make(map[common.Address]*ModifySyncRequest)

	// Group modify sync request by the remote syncer.
	// Identifying which node to use for the given streams.
	for _, cookie := range req.ToAdd {
		streamID := StreamId(cookie.GetStreamId())
		if _, found := ss.streamID2Syncer.Load(streamID); found {
			continue
		}

		var (
			selectedNode  common.Address
			nodeAvailable bool
		)

		// Try node from the cookie first
		if addrRaw := cookie.GetNodeAddress(); len(addrRaw) > 0 {
			selectedNode = common.BytesToAddress(addrRaw)
			if selectedNode.Cmp(ss.localNodeAddress) == 0 {
				nodeAvailable = true
			} else {
				if _, err := ss.nodeRegistry.GetStreamServiceClientForAddress(selectedNode); err == nil {
					nodeAvailable = true
				}
			}
		}

		// Add fallback nodes in case if cookie-provided node is unavailable
		if !nodeAvailable {
			stream, err := ss.streamCache.GetStreamNoWait(ctx, streamID)
			if err != nil {
				rvrErr := AsRiverError(err)
				req.AddingFailureHandler(&SyncStreamOpStatus{
					StreamId: streamID[:],
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
				continue
			}

			remotes, isLocal := stream.GetRemotesAndIsLocal()

			// Try using the local node if the stream is local
			if isLocal {
				selectedNode = ss.localNodeAddress
				nodeAvailable = true
			}

			// Try using the remote nodes
			if !nodeAvailable && len(remotes) > 0 {
				selectedNode = stream.GetStickyPeer()
				for range remotes {
					if _, err = ss.nodeRegistry.GetStreamServiceClientForAddress(selectedNode); err == nil {
						nodeAvailable = true
						break
					}
					selectedNode = stream.AdvanceStickyPeer(selectedNode)
				}
			}
		}

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
		syncer, found := ss.streamID2Syncer.Load(StreamId(streamIDRaw))
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
	for nodeAddress, modifySync := range modifySyncs {
		// Get syncer for the given node address
		syncer, err := ss.getOrCreateSyncer(nodeAddress)
		if err != nil {
			rvrErr := AsRiverError(err)
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

			for _, cookie := range successfullyAdded {
				ss.streamID2Syncer.Store(StreamId(cookie.GetStreamId()), syncer)
			}
			for _, streamIdRaw := range successfullyRemoved {
				ss.streamID2Syncer.Delete(StreamId(streamIdRaw))
			}
			if syncerStopped {
				ss.syncers.Delete(syncer.Address())
			}
		}(modifySync)
	}
	wg.Wait()
}

func (ss *SyncerSet) DebugDropStream(ctx context.Context, streamID StreamId) error {
	syncer, found := ss.streamID2Syncer.Load(streamID)
	if !found {
		return RiverError(Err_NOT_FOUND, "Stream not part of sync operation").
			Tags("syncId", ss.syncID, "streamId", streamID)
	}

	syncerStopped, err := syncer.DebugDropStream(ctx, streamID)
	if err != nil {
		return err
	}

	ss.streamID2Syncer.Delete(streamID)
	if syncerStopped {
		ss.syncers.Delete(syncer.Address())
	}

	return nil
}

// getOrCreateSyncer returns the syncer for the given node address.
// If the syncer does not exist, it creates a new one and starts it.
func (ss *SyncerSet) getOrCreateSyncer(nodeAddress common.Address) (StreamsSyncer, error) {
	if syncer, found := ss.syncers.Load(nodeAddress); found {
		return syncer, nil
	}

	var syncer StreamsSyncer

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
			ss.streamID2Syncer.Delete,
			ss.messages,
			ss.otelTracer,
		)
		if err != nil {
			return nil, AsRiverError(err).Tag("remoteSyncerAddr", nodeAddress)
		}
	}

	ss.syncers.Store(nodeAddress, syncer)
	ss.syncerTasks.Add(1)
	go func() {
		syncer.Run()
		ss.syncerTasks.Done()
		ss.syncers.Delete(syncer.Address())
	}()

	return syncer, nil
}

// Validate checks the modify request for errors and returns an error if any are found.
func (mr *ModifyRequest) Validate() error {
	// Make sure the request is not empty
	if len(mr.ToAdd) == 0 && len(mr.ToRemove) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "Empty modify sync request")
	}

	// Prevent passing the same stream to both add and remove operations
	if slices.ContainsFunc(mr.ToAdd, func(c *SyncCookie) bool {
		return slices.ContainsFunc(mr.ToRemove, func(streamId []byte) bool {
			return StreamId(c.GetStreamId()) == StreamId(streamId)
		})
	}) {
		return RiverError(Err_INVALID_ARGUMENT, "Found the same stream in both add and remove lists")
	}

	// Prevent duplicates in the add list
	if len(mr.ToAdd) > 1 {
		seen := make(map[StreamId]struct{}, len(mr.ToAdd))
		for _, c := range mr.ToAdd {
			streamId := StreamId(c.GetStreamId())
			if _, exists := seen[streamId]; exists {
				return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in add operation")
			}
			seen[streamId] = struct{}{}
		}
	}

	// Prevent duplicates in the remove list
	if len(mr.ToRemove) > 1 {
		seen := make(map[StreamId]struct{}, len(mr.ToRemove))
		for _, s := range mr.ToRemove {
			streamId := StreamId(s)
			if _, exists := seen[streamId]; exists {
				return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in remove operation")
			}
			seen[streamId] = struct{}{}
		}
	}

	return nil
}
