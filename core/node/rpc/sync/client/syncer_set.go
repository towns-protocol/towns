package client

import (
	"bytes"
	"context"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel/codes"

	"github.com/towns-protocol/towns/core/node/logging"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
	// MessageDistributor defines the contract for distributing messages to subscriptions
	MessageDistributor interface {
		DistributeMessage(streamID StreamId, msg *SyncStreamsResponse)
		DistributeBackfillMessage(streamID StreamId, msg *SyncStreamsResponse)
	}

	StreamsSyncer interface {
		Run()
		Address() common.Address
		Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error)
		DebugDropStream(ctx context.Context, streamID StreamId) (bool, error)
	}

	// StreamCache represents a behavior of the stream cache
	StreamCache interface {
		GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (*events.Stream, error)
		GetStreamNoWait(ctx context.Context, streamId StreamId) (*events.Stream, error)
	}

	ModifyRequest struct {
		SyncID                    string
		ToAdd                     []*SyncCookie
		ToRemove                  [][]byte
		ToBackfill                []*ModifySyncRequest_Backfill
		AddingFailureHandler      func(status *SyncStreamOpStatus)
		RemovingFailureHandler    func(status *SyncStreamOpStatus)
		BackfillingFailureHandler func(status *SyncStreamOpStatus)
	}

	// syncerWithLock holds a syncer with its associated lock
	syncerWithLock struct {
		StreamsSyncer
		deadlock.Mutex
	}

	// SyncerSet is the set of StreamsSyncers that are used for a sync operation.
	SyncerSet struct {
		// globalCtx is the root context for all syncers in this set and used to cancel them
		globalCtx context.Context
		// localNodeAddress is the node address for this stream node instance
		localNodeAddress common.Address
		// messageDistributor is used to distribute messages to subscriptions
		messageDistributor MessageDistributor
		// unsubStream is called when a stream is no longer syncing due to the node outage or something else.
		unsubStream func(streamID StreamId)
		// streamCache is used to subscribe to streams managed by this node instance
		streamCache StreamCache
		// nodeRegistry keeps a mapping from node address to node meta-data
		nodeRegistry nodes.NodeRegistry
		// syncerTasks is a wait group for running background StreamsSyncers that is used to ensure all syncers stopped
		syncerTasks sync.WaitGroup
		// stopped holds an indication if the sync operation is stopped
		stopped atomic.Bool
		// syncers is the existing set of syncers, indexed by the syncer node address
		syncers *xsync.Map[common.Address, *syncerWithLock]
		// streamID2Syncer maps from a stream to its syncer
		streamID2Syncer *xsync.Map[StreamId, StreamsSyncer]
		// streamLocks provides per-stream locking
		streamLocks *xsync.Map[StreamId, *deadlock.Mutex]
		// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
		otelTracer trace.Tracer
	}
)

var (
	_ StreamsSyncer = (*localSyncer)(nil)
	_ StreamsSyncer = (*remoteSyncer)(nil)
)

// NewSyncers creates the required syncer set that subscribe on all given cookies.
// A syncer can either be local or remote and writes received events to an internal messages channel from which events
// are streamed to the client.
func NewSyncers(
	globalCtx context.Context,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
	localNodeAddress common.Address,
	messageDistributor MessageDistributor,
	unsubStream func(streamID StreamId),
	otelTracer trace.Tracer,
) *SyncerSet {
	return &SyncerSet{
		globalCtx:          globalCtx,
		streamCache:        streamCache,
		nodeRegistry:       nodeRegistry,
		localNodeAddress:   localNodeAddress,
		messageDistributor: messageDistributor,
		unsubStream:        unsubStream,
		syncers:            xsync.NewMap[common.Address, *syncerWithLock](),
		streamID2Syncer:    xsync.NewMap[StreamId, StreamsSyncer](),
		streamLocks:        xsync.NewMap[StreamId, *deadlock.Mutex](),
		otelTracer:         otelTracer,
	}
}

func (ss *SyncerSet) Run() {
	<-ss.globalCtx.Done() // node went down
	ss.stopped.Store(true)
	ss.syncerTasks.Wait() // background syncers finished -> safe to close messages channel
}

// lockStreams acquires locks for all streams in the request in a consistent order to prevent deadlocks.
// Returns a function to unlock the streams after the operation is done.
func (ss *SyncerSet) lockStreams(ctx context.Context, req ModifyRequest) func() {
	if ss.otelTracer != nil {
		_, span := ss.otelTracer.Start(ctx, "SyncerSet::lockStreams",
			trace.WithAttributes(
				attribute.Int("toBackfill", len(req.ToBackfill)),
				attribute.Int("toAdd", len(req.ToAdd)),
				attribute.Int("toRemove", len(req.ToRemove))))
		defer span.End()
	}

	// Collect all stream IDs that need to be locked
	streamIDs := make(map[StreamId]struct{})

	// Lock streams from ToBackfill if they are not syncing yet.
	// Syncing streams do not need to be locked to perform a backfill.
	for _, backfill := range req.ToBackfill {
		for _, cookie := range backfill.GetStreams() {
			streamIDs[StreamId(cookie.GetStreamId())] = struct{}{}
		}
	}

	// Lock streams from ToAdd is they are not syncing yet.
	for _, cookie := range req.ToAdd {
		streamIDs[StreamId(cookie.GetStreamId())] = struct{}{}
	}

	// Add streams from ToRemove
	toRemove := make(map[StreamId]struct{}, len(req.ToRemove))
	for _, streamID := range req.ToRemove {
		streamIDs[StreamId(streamID)] = struct{}{}
		toRemove[StreamId(streamID)] = struct{}{}
	}

	// Convert to slice and sort for consistent locking order
	orderedStreamIDs := make([]StreamId, 0, len(streamIDs))
	for streamID := range streamIDs {
		orderedStreamIDs = append(orderedStreamIDs, streamID)
	}
	slices.SortFunc(orderedStreamIDs, func(a, b StreamId) int {
		return bytes.Compare(a[:], b[:])
	})

	// Acquire locks in order. Do not lock streams that are already syncing.
	lockedStreamIDs := make([]StreamId, 0, len(streamIDs))
	for _, streamID := range orderedStreamIDs {
		ss.streamLocks.Compute(
			streamID,
			func(streamLock *deadlock.Mutex, loaded bool) (*deadlock.Mutex, xsync.ComputeOp) {
				_, syncing := ss.streamID2Syncer.Load(streamID)
				_, streamToRemove := toRemove[streamID]

				if (!syncing && !streamToRemove) || (syncing && streamToRemove) {
					if !loaded || streamLock == nil {
						streamLock = &deadlock.Mutex{}
					}
					streamLock.Lock()
					lockedStreamIDs = append(lockedStreamIDs, streamID)
					return streamLock, xsync.UpdateOp
				}

				return streamLock, xsync.CancelOp
			},
		)
	}

	return func() {
		ss.unlockStreams(lockedStreamIDs)
	}
}

// unlockStream releases locks for the given stream ID
func (ss *SyncerSet) unlockStream(streamID StreamId) {
	lock, ok := ss.streamLocks.Load(streamID)
	if !ok {
		return
	}
	lock.Unlock()
}

// unlockStreams releases locks for the given stream IDs
func (ss *SyncerSet) unlockStreams(streamIDs []StreamId) {
	for _, streamID := range streamIDs {
		ss.unlockStream(streamID)
	}
}

// Modify splits the given request into add and remove operations and forwards them to the responsible syncers.
func (ss *SyncerSet) Modify(ctx context.Context, req ModifyRequest) error {
	if ss.otelTracer != nil {
		var span trace.Span
		ctx, span = ss.otelTracer.Start(ctx, "syncerset::modify")
		defer span.End()
	}

	// Validate modify request
	if err := req.Validate(); err != nil {
		return AsRiverError(err).Func("SyncerSet.Modify")
	}

	var (
		addingFailuresLock      sync.Mutex
		backfillingFailuresLock sync.Mutex
		removingFailuresLock    sync.Mutex
	)

	// 1. Optimistic try to backfill and remove streams since syncers are expected
	// to be running and ready to process the request.
	if len(req.ToRemove) > 0 || len(req.ToBackfill) > 0 {
		backfillingFailures := make([]StreamId, 0, len(req.ToBackfill))
		backfillingFailuresHandler := func(status *SyncStreamOpStatus) {
			backfillingFailuresLock.Lock()
			backfillingFailures = append(backfillingFailures, StreamId(status.GetStreamId()))
			backfillingFailuresLock.Unlock()
		}

		removingFailures := make([][]byte, 0, len(req.ToRemove))
		removingFailuresHandler := func(status *SyncStreamOpStatus) {
			removingFailuresLock.Lock()
			removingFailures = append(removingFailures, status.GetStreamId())
			removingFailuresLock.Unlock()
		}

		// Send the modify request to the syncers to backfill and remove streams.
		unlock := ss.lockStreams(ctx, ModifyRequest{ToRemove: req.ToRemove})
		err := ss.modifyNoLock(ctx, ModifyRequest{
			SyncID:                    req.SyncID,
			ToBackfill:                req.ToBackfill,
			ToRemove:                  req.ToRemove,
			BackfillingFailureHandler: backfillingFailuresHandler,
			RemovingFailureHandler:    removingFailuresHandler,
		}, false)
		unlock()
		if err != nil {
			return AsRiverError(err).Func("SyncerSet.Modify.first")
		}

		// Remove successful backfilled streams from the request.
		if len(backfillingFailures) > 0 {
			backfills := make(map[string][]*SyncCookie, len(backfillingFailures))
			for _, streamID := range backfillingFailures {
				var syncID string
				preparedSyncCookie := &SyncCookie{
					StreamId: streamID[:],
				}
				for _, backfill := range req.ToBackfill {
					for _, cookie := range backfill.GetStreams() {
						if StreamId(cookie.GetStreamId()) == streamID {
							preparedSyncCookie = cookie
							syncID = backfill.GetSyncId()
							break
						}
					}
				}
				if _, ok := backfills[syncID]; !ok {
					backfills[syncID] = []*SyncCookie{preparedSyncCookie}
				} else {
					backfills[syncID] = append(backfills[syncID], preparedSyncCookie)
				}
			}
			req.ToBackfill = nil
			for syncID, cookies := range backfills {
				req.ToBackfill = append(req.ToBackfill, &ModifySyncRequest_Backfill{
					SyncId:  syncID,
					Streams: cookies,
				})
			}
		} else {
			req.ToBackfill = nil
		}

		// Remove successful removed streams from the request.
		if len(removingFailures) > 0 {
			req.ToRemove = removingFailures
		} else {
			req.ToRemove = nil
		}

		// Early exit if there are no streams to modify.
		if len(req.ToRemove) == 0 && len(req.ToAdd) == 0 && len(req.ToBackfill) == 0 {
			return nil
		}
	}

	// 2. The second try for adding and backfilling streams with the provided node address in cookie.
	{
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

		backfillingFailures := make([]StreamId, 0, len(req.ToBackfill))
		backfillingFailuresHandler := func(status *SyncStreamOpStatus) {
			if status.GetCode() != int32(Err_NOT_FOUND) && status.GetCode() != int32(Err_INTERNAL) {
				req.BackfillingFailureHandler(status)
				return
			}

			backfillingFailuresLock.Lock()
			backfillingFailures = append(backfillingFailures, StreamId(status.GetStreamId()))
			backfillingFailuresLock.Unlock()
		}

		removingFailures := make([][]byte, 0, len(req.ToRemove))
		removingFailuresHandler := func(status *SyncStreamOpStatus) {
			if status.GetCode() != int32(Err_NOT_FOUND) && status.GetCode() != int32(Err_INTERNAL) {
				req.RemovingFailureHandler(status)
				return
			}

			removingFailuresLock.Lock()
			removingFailures = append(removingFailures, status.GetStreamId())
			removingFailuresLock.Unlock()
		}

		if err := ss.modify(ctx, ModifyRequest{
			SyncID:                    req.SyncID,
			ToBackfill:                req.ToBackfill,
			ToAdd:                     req.ToAdd,
			ToRemove:                  req.ToRemove,
			BackfillingFailureHandler: backfillingFailuresHandler,
			AddingFailureHandler:      addingFailuresHandler,
			RemovingFailureHandler:    removingFailuresHandler,
		}, false); err != nil {
			return AsRiverError(err).Func("SyncerSet.Modify.second")
		}

		// If a stream was failed to backfill, just try again one more time.
		if len(backfillingFailures) > 0 {
			backfills := make(map[string][]*SyncCookie, len(backfillingFailures))
			for _, streamID := range backfillingFailures {
				var syncID string
				preparedSyncCookie := &SyncCookie{
					StreamId: streamID[:],
				}
				for _, backfill := range req.ToBackfill {
					for _, cookie := range backfill.GetStreams() {
						if StreamId(cookie.GetStreamId()) == streamID {
							preparedSyncCookie = cookie
							syncID = backfill.GetSyncId()
							break
						}
					}
				}
				if _, ok := backfills[syncID]; !ok {
					backfills[syncID] = []*SyncCookie{preparedSyncCookie}
				} else {
					backfills[syncID] = append(backfills[syncID], preparedSyncCookie)
				}
			}
			req.ToBackfill = nil
			for syncID, cookies := range backfills {
				req.ToBackfill = append(req.ToBackfill, &ModifySyncRequest_Backfill{
					SyncId:  syncID,
					Streams: cookies,
				})
			}
		} else {
			req.ToBackfill = nil
		}

		// If a stream was failed to add, just try again one more time with reset cookie.
		if len(addingFailures) > 0 {
			toAdd := make([]*SyncCookie, len(addingFailures))
			for i, status := range addingFailures {
				preparedSyncCookie := &SyncCookie{
					StreamId: status.StreamId,
				}
				for _, cookie := range req.ToAdd {
					if StreamId(cookie.GetStreamId()) == StreamId(status.StreamId) {
						preparedSyncCookie = cookie
						break
					}
				}
				preparedSyncCookie.NodeAddress = status.NodeAddress
				toAdd[i] = preparedSyncCookie
			}
			req.ToAdd = toAdd
		} else {
			req.ToAdd = nil
		}

		// If a stream was failed to remove, just try again one more time.
		if len(removingFailures) > 0 {
			req.ToRemove = removingFailures
		} else {
			req.ToRemove = nil
		}

		// Early exit if there are no streams to modify.
		if len(req.ToRemove) == 0 && len(req.ToAdd) == 0 && len(req.ToBackfill) == 0 {
			return nil
		}
	}

	// 3. If the first attempt failed, try to remove node address from cookies and send the modify sync again.
	// There could be a case when a client specifies a wrong node address which leads to errors.
	// This case should be properly handled by resetting the node address and retrying the operation.
	return ss.modify(ctx, req, true)
}

// modify implements the actual modification logic
func (ss *SyncerSet) modify(ctx context.Context, req ModifyRequest, changeNode bool) error {
	if ss.stopped.Load() {
		return RiverError(Err_CANCELED, "Sync stopped")
	}

	// Lock streams from the request excluding backfills.
	unlock := ss.lockStreams(ctx, req)
	defer unlock()

	return ss.modifyNoLock(ctx, req, changeNode)
}

// modifyNoLock performs the modification without acquiring locks.
func (ss *SyncerSet) modifyNoLock(ctx context.Context, req ModifyRequest, changeNode bool) error {
	if ss.stopped.Load() {
		return RiverError(Err_CANCELED, "Sync stopped")
	}

	// Group modifications by node address
	modifySyncs := make(map[common.Address]*ModifySyncRequest)

	// Process backfill requests (only for streams that are already syncing)
	for _, backfill := range req.ToBackfill {
		for _, cookie := range backfill.GetStreams() {
			streamID := StreamId(cookie.GetStreamId())

			// The given stream must be syncing
			syncer, found := ss.streamID2Syncer.Load(streamID)
			if !found {
				req.BackfillingFailureHandler(&SyncStreamOpStatus{
					StreamId: streamID[:],
					Code:     int32(Err_NOT_FOUND),
					Message:  "Stream must be syncing to be backfilled",
				})
				continue
			}

			if _, ok := modifySyncs[syncer.Address()]; !ok {
				modifySyncs[syncer.Address()] = &ModifySyncRequest{
					SyncId:          req.SyncID,
					BackfillStreams: &ModifySyncRequest_Backfill{SyncId: backfill.GetSyncId()},
				}
			}

			modifySyncs[syncer.Address()].BackfillStreams.Streams = append(
				modifySyncs[syncer.Address()].BackfillStreams.Streams,
				cookie.CopyWithAddr(syncer.Address()),
			)
		}
	}

	// Process add requests
	for _, cookie := range req.ToAdd {
		streamID := StreamId(cookie.GetStreamId())

		// Backfill the given stream if it is added already.
		if syncer, found := ss.streamID2Syncer.Load(streamID); found {
			if _, ok := modifySyncs[syncer.Address()]; !ok {
				modifySyncs[syncer.Address()] = &ModifySyncRequest{
					SyncId:          req.SyncID,
					BackfillStreams: &ModifySyncRequest_Backfill{SyncId: req.SyncID},
				}
			} else if modifySyncs[syncer.Address()].BackfillStreams == nil {
				modifySyncs[syncer.Address()].BackfillStreams = &ModifySyncRequest_Backfill{SyncId: req.SyncID}
			}
			modifySyncs[syncer.Address()].BackfillStreams.Streams = append(
				modifySyncs[syncer.Address()].BackfillStreams.Streams,
				cookie.CopyWithAddr(syncer.Address()),
			)
			continue
		}

		selectedNode, nodeAvailable := ss.selectNodeForStream(ctx, cookie, changeNode)
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
		ss.distributeSyncModifications(
			ctx,
			modifySyncs,
			req.BackfillingFailureHandler,
			req.AddingFailureHandler,
			req.RemovingFailureHandler,
		)
	}

	return nil
}

// distributeSyncModifications distributes the given modify sync requests to the responsible syncers.
func (ss *SyncerSet) distributeSyncModifications(
	ctx context.Context,
	modifySyncs map[common.Address]*ModifySyncRequest,
	failedToBackfill func(status *SyncStreamOpStatus),
	failedToAdd func(status *SyncStreamOpStatus),
	failedToRemove func(status *SyncStreamOpStatus),
) {
	if ss.otelTracer != nil {
		var span trace.Span
		ctx, span = ss.otelTracer.Start(ctx, "syncerset::distributeSyncModifications")
		defer span.End()
	}

	var wg sync.WaitGroup
	for nodeAddress, modifySync := range modifySyncs {
		// Get syncer for the given node address
		syncer, err := ss.getOrCreateSyncer(ctx, nodeAddress)
		if err != nil || syncer == nil {
			rvrErr := AsRiverError(err).Tag("remoteSyncerAddr", nodeAddress)
			for _, cookie := range modifySync.GetBackfillStreams().GetStreams() {
				failedToBackfill(&SyncStreamOpStatus{
					StreamId:    cookie.GetStreamId(),
					Code:        int32(rvrErr.Code),
					Message:     rvrErr.GetMessage(),
					NodeAddress: nodeAddress.Bytes(),
				})
			}
			for _, cookie := range modifySync.GetAddStreams() {
				failedToAdd(&SyncStreamOpStatus{
					StreamId:    cookie.GetStreamId(),
					Code:        int32(rvrErr.Code),
					Message:     rvrErr.GetMessage(),
					NodeAddress: nodeAddress.Bytes(),
				})
			}
			for _, streamIDRaw := range modifySync.GetRemoveStreams() {
				failedToRemove(&SyncStreamOpStatus{
					StreamId:    streamIDRaw,
					Code:        int32(rvrErr.Code),
					Message:     rvrErr.GetMessage(),
					NodeAddress: nodeAddress.Bytes(),
				})
			}
			continue
		}

		wg.Add(1)
		go func(nodeAddress common.Address, modifySync *ModifySyncRequest) {
			defer wg.Done()

			ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
			defer cancel()

			resp, _, err := syncer.Modify(ctx, modifySync)
			if err != nil {
				rvrErr := AsRiverError(err, Err_INTERNAL).Tag("remoteSyncerAddr", syncer.Address())
				for _, cookie := range modifySync.GetBackfillStreams().GetStreams() {
					failedToBackfill(&SyncStreamOpStatus{
						StreamId:    cookie.GetStreamId(),
						Code:        int32(rvrErr.Code),
						Message:     rvrErr.GetMessage(),
						NodeAddress: nodeAddress.Bytes(),
					})
				}
				for _, cookie := range modifySync.GetAddStreams() {
					failedToAdd(&SyncStreamOpStatus{
						StreamId:    cookie.GetStreamId(),
						Code:        int32(rvrErr.Code),
						Message:     rvrErr.GetMessage(),
						NodeAddress: nodeAddress.Bytes(),
					})
				}
				for _, streamIDRaw := range modifySync.GetRemoveStreams() {
					failedToRemove(&SyncStreamOpStatus{
						StreamId:    streamIDRaw,
						Code:        int32(rvrErr.Code),
						Message:     rvrErr.GetMessage(),
						NodeAddress: nodeAddress.Bytes(),
					})
				}
				return
			}

			for _, status := range resp.GetBackfills() {
				failedToBackfill(status)
			}

			// Create a set of failed stream IDs
			failedAddStreams := make(map[StreamId]struct{}, len(resp.GetAdds()))
			for _, status := range resp.GetAdds() {
				failedAddStreams[StreamId(status.StreamId)] = struct{}{}
				failedToAdd(status)
			}

			// Create a set of failed stream IDs
			failedRemoveStreams := make(map[StreamId]struct{}, len(resp.GetRemovals()))
			for _, status := range resp.GetRemovals() {
				failedRemoveStreams[StreamId(status.StreamId)] = struct{}{}
				failedToRemove(status)
			}

			for _, cookie := range modifySync.GetAddStreams() {
				if _, failed := failedAddStreams[StreamId(cookie.GetStreamId())]; !failed {
					ss.streamID2Syncer.Store(StreamId(cookie.GetStreamId()), syncer)
				}
			}
			for _, streamIdRaw := range modifySync.GetRemoveStreams() {
				if _, failed := failedRemoveStreams[StreamId(streamIdRaw)]; !failed {
					ss.streamID2Syncer.Delete(StreamId(streamIdRaw))
				}
			}
		}(nodeAddress, modifySync)
	}
	wg.Wait()
}

func (ss *SyncerSet) DebugDropStream(ctx context.Context, streamID StreamId) error {
	syncer, found := ss.streamID2Syncer.Load(streamID)
	if !found {
		return RiverError(Err_NOT_FOUND, "Stream not part of sync operation").
			Tag("stream", streamID).
			Func("DebugDropStream")
	}

	if _, err := syncer.DebugDropStream(ctx, streamID); err != nil {
		return err
	}

	ss.streamID2Syncer.Delete(streamID)

	return nil
}

// selectNodeForStream attempts to find an available node for the given stream in the following order:
// 1. Node specified in the cookie (if any)
// 2. Local node (if stream is local)
// 3. Remote nodes (in order of preference)
// Extra logic is applied if changeNode is true, which means that the node from the cookie should not be used.
// Returns the selected node address and true if a node was found and available, false otherwise.
// Initializes syncer for the selected node if it does not exist yet.
func (ss *SyncerSet) selectNodeForStream(ctx context.Context, cookie *SyncCookie, changeNode bool) (common.Address, bool) {
	streamID := StreamId(cookie.GetStreamId())
	usedNode := common.BytesToAddress(cookie.GetNodeAddress())

	var span trace.Span
	if ss.otelTracer != nil {
		ctx, span = ss.otelTracer.Start(ctx, "syncerset::selectNodeForStream",
			trace.WithAttributes(
				attribute.Bool("changeNode", changeNode),
				attribute.String("targetNode", usedNode.Hex()),
				attribute.String("streamID", streamID.String())))
		defer span.End()
	}

	// 1. Try node from cookie first
	if !changeNode {
		if addrRaw := cookie.GetNodeAddress(); len(addrRaw) > 0 {
			selectedNode := common.BytesToAddress(addrRaw)
			if _, err := ss.getOrCreateSyncer(ctx, selectedNode); err == nil {
				return selectedNode, true
			} else {
				logging.FromCtx(ss.globalCtx).Errorw("Failed to get or create syncer for node from cookie",
					"nodeAddress", selectedNode, "streamId", streamID, "error", err)
			}
		}
	}

	stream, err := ss.streamCache.GetStreamNoWait(ctx, streamID)
	if err != nil {
		logging.FromCtx(ss.globalCtx).Errorw("Failed to get stream from cache for syncer selection",
			"streamId", streamID, "error", err)
		if span != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
		}
		return common.Address{}, false
	}

	// 2. Try local node if stream is local
	remotes, isLocal := stream.GetRemotesAndIsLocal()
	if isLocal && (!changeNode || ss.localNodeAddress != usedNode) {
		if _, err = ss.getOrCreateSyncer(ctx, ss.localNodeAddress); err == nil {
			return ss.localNodeAddress, true
		} else {
			logging.FromCtx(ss.globalCtx).Errorw("Failed to get or create local syncer for node",
				"nodeAddress", ss.localNodeAddress, "streamId", streamID, "error", err)
		}
	}

	// If changeNode is true, we should not use the usedNode address
	if changeNode {
		remotes = slices.DeleteFunc(remotes, func(addr common.Address) bool {
			return addr == usedNode
		})
	}

	// 3. Try remote nodes
	if len(remotes) > 0 {
		selectedNode := stream.GetStickyPeer()
		for range remotes {
			var subSpan trace.Span
			remoteCtx := ctx
			if ss.otelTracer != nil {
				remoteCtx, subSpan = ss.otelTracer.Start(ctx, "syncerset::selectNodeForStream::remote",
					trace.WithAttributes(attribute.String("selectedNode", selectedNode.String())))
			}

			if _, err = ss.getOrCreateSyncer(remoteCtx, selectedNode); err == nil {
				return selectedNode, true
			} else {
				logging.FromCtx(ss.globalCtx).Errorw("Failed to get or create syncer for remote node",
					"nodeAddress", selectedNode, "streamId", streamID, "error", err)
				if subSpan != nil {
					subSpan.RecordError(err)
					subSpan.SetStatus(codes.Error, err.Error())
				}
			}
			selectedNode = stream.AdvanceStickyPeer(selectedNode)
		}
	}

	return common.Address{}, false
}

// getOrCreateSyncer returns the syncer for the given node address.
// If the syncer does not exist, it creates a new one and starts it.
// This implementation uses per-node-address locking to avoid blocking
// other operations while creating syncers (which can be slow due to network calls).
func (ss *SyncerSet) getOrCreateSyncer(ctx context.Context, nodeAddress common.Address) (StreamsSyncer, error) {
	// Check if stopped before creating
	if ss.stopped.Load() {
		return nil, RiverError(Err_CANCELED, "Sync stopped")
	}

	if ss.otelTracer != nil {
		_, span := ss.otelTracer.Start(ctx, "syncerset::getOrCreateSyncer",
			trace.WithAttributes(attribute.String("address", nodeAddress.Hex())))
		defer span.End()
	}

	syncerEntity, _ := ss.syncers.LoadOrStore(nodeAddress, &syncerWithLock{})

	// Lock the syncer for initialization check/creation
	syncerEntity.Lock()
	defer syncerEntity.Unlock()

	// Check if already initialized (by us or another goroutine)
	if syncerEntity.StreamsSyncer != nil {
		return syncerEntity.StreamsSyncer, nil
	}

	var syncer StreamsSyncer
	if nodeAddress == ss.localNodeAddress {
		syncer = newLocalSyncer(
			ss.globalCtx,
			ss.localNodeAddress,
			ss.streamCache,
			ss.messageDistributor,
			ss.onStreamDown,
			ss.otelTracer,
		)
	} else {
		client, err := ss.nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
		if err != nil {
			return nil, AsRiverError(err).Tag("remoteSyncerAddr", nodeAddress)
		}

		syncer, err = NewRemoteSyncer(
			ss.globalCtx,
			nodeAddress,
			client,
			ss.onStreamDown,
			ss.messageDistributor,
			ss.otelTracer,
		)
		if err != nil {
			return nil, AsRiverError(err).Tag("remoteSyncerAddr", nodeAddress)
		}
	}

	syncerEntity.StreamsSyncer = syncer

	// Start the syncer
	ss.syncerTasks.Add(1)
	go func() {
		syncer.Run()
		ss.syncerTasks.Done()
		syncerEntity.Lock()
		syncerEntity.StreamsSyncer = nil
		syncerEntity.Unlock()
	}()

	return syncer, nil
}

// onStreamDown is called when a stream is no longer syncing, e.g., due to node outage or other reasons.
func (ss *SyncerSet) onStreamDown(streamID StreamId) {
	if ss.unsubStream != nil {
		ss.unsubStream(streamID)
	}

	// Remove the stream from the syncer set.
	// !!! MIGHT BE A POTENTIAL RACE CONDITION IF THE GIVEN STREAM IS BEING MODIFIED, LOOK MORE INTO IT LATER !!!
	ss.streamID2Syncer.Delete(streamID)
}

// Validate checks the modify request for errors and returns an error if any are found.
func (mr *ModifyRequest) Validate() error {
	// Make sure the request is not empty
	if len(mr.ToAdd) == 0 && len(mr.ToRemove) == 0 && len(mr.ToBackfill) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "Empty modify sync request")
	}

	// Prevent duplicates in the backfill list
	seen := make(map[StreamId]struct{})
	for _, backfill := range mr.ToBackfill {
		for _, c := range backfill.GetStreams() {
			streamId, err := StreamIdFromBytes(c.GetStreamId())
			if err != nil {
				return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in backfill list")
			}

			if _, exists := seen[streamId]; exists {
				return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in backfill list")
			}
			seen[streamId] = struct{}{}
		}
	}

	// Prevent duplicates in the add list
	seen = make(map[StreamId]struct{}, len(mr.ToAdd))
	for _, c := range mr.ToAdd {
		streamId, err := StreamIdFromBytes(c.GetStreamId())
		if err != nil {
			return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in add list")
		}

		if _, exists := seen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in add list")
		}
		seen[streamId] = struct{}{}
	}

	// Prevent duplicates in the remove list
	removeSeen := make(map[StreamId]struct{}, len(mr.ToRemove))
	for _, s := range mr.ToRemove {
		streamId, err := StreamIdFromBytes(s)
		if err != nil {
			return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in remove list")
		}

		if _, exists := removeSeen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in remove list")
		}
		removeSeen[streamId] = struct{}{}

		if _, exists := seen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Stream in remove list is also in add list")
		}
	}

	return nil
}
