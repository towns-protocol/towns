package client

import (
	"bytes"
	"context"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	// commonBufferSize is the size of the common messages buffer of the shared syncer.
	commonBufferSize = 10240
)

type (
	StreamsSyncer interface {
		Run()
		Address() common.Address
		Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error)
		DebugDropStream(ctx context.Context, streamID StreamId) (bool, error)
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

	// SyncerSet is the set of StreamsSyncers that are used for a sync operation.
	SyncerSet struct {
		// globalCtx is the root context for all syncers in this set and used to cancel them
		globalCtx context.Context
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
		// muSyncers guards syncers map
		muSyncers deadlock.Mutex
		// stopped holds an indication if the sync operation is stopped
		stopped atomic.Bool
		// syncers is the existing set of syncers, indexed by the syncer node address
		syncers map[common.Address]StreamsSyncer
		// streamID2Syncer maps from a stream to its syncer
		streamID2Syncer *xsync.Map[StreamId, StreamsSyncer]
		// streamLocks provides per-stream locking
		streamLocks *xsync.Map[StreamId, *sync.Mutex]
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
	streamCache *StreamCache,
	nodeRegistry nodes.NodeRegistry,
	localNodeAddress common.Address,
	otelTracer trace.Tracer,
) (*SyncerSet, *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]) {
	ss := &SyncerSet{
		globalCtx:        globalCtx,
		streamCache:      streamCache,
		nodeRegistry:     nodeRegistry,
		localNodeAddress: localNodeAddress,
		syncers:          make(map[common.Address]StreamsSyncer),
		messages:         dynmsgbuf.NewDynamicBufferWithSize[*SyncStreamsResponse](commonBufferSize),
		streamID2Syncer:  xsync.NewMap[StreamId, StreamsSyncer](),
		streamLocks:      xsync.NewMap[StreamId, *sync.Mutex](),
		otelTracer:       otelTracer,
	}
	return ss, ss.messages
}

func (ss *SyncerSet) Run() {
	<-ss.globalCtx.Done() // node went down
	ss.stopped.Store(true)
	ss.syncerTasks.Wait() // background syncers finished -> safe to close messages channel
}

// getStreamLock returns a lock for the given stream ID, creating it if it doesn't exist
func (ss *SyncerSet) getStreamLock(streamID StreamId) *sync.Mutex {
	lock, _ := ss.streamLocks.LoadOrStore(streamID, &sync.Mutex{})
	return lock
}

// waitForStreamUnlock waits for a stream to be unlocked with a timeout
func (ss *SyncerSet) waitForStreamUnlock(ctx context.Context, streamID StreamId) error {
	lock, ok := ss.streamLocks.Load(streamID)
	if !ok {
		// If no lock exists for this stream, it means it's not currently locked
		return nil
	}

	// Try to acquire the lock immediately first
	if acquired := lock.TryLock(); acquired {
		lock.Unlock()
		return nil
	}

	// If lock is held, wait for it with timeout
	done := make(chan struct{})
	go func() {
		lock.Lock()
		lock.Unlock() //lint:ignore SA2001 just waiting for the stream to be unlocked and then proceed
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// lockStreams acquires locks for all streams in the request in a consistent order to prevent deadlocks
func (ss *SyncerSet) lockStreams(req ModifyRequest) []StreamId {
	// Collect all stream IDs that need to be locked
	streamIDs := make(map[StreamId]struct{})

	// Add streams from ToAdd
	for _, cookie := range req.ToAdd {
		streamIDs[StreamId(cookie.GetStreamId())] = struct{}{}
	}

	// Add streams from ToRemove
	for _, streamID := range req.ToRemove {
		streamIDs[StreamId(streamID)] = struct{}{}
	}

	// Convert to slice and sort for consistent locking order
	orderedStreamIDs := make([]StreamId, 0, len(streamIDs))
	for streamID := range streamIDs {
		orderedStreamIDs = append(orderedStreamIDs, streamID)
	}
	slices.SortFunc(orderedStreamIDs, func(a, b StreamId) int {
		return bytes.Compare(a[:], b[:])
	})

	// Acquire locks in order
	for _, streamID := range orderedStreamIDs {
		ss.getStreamLock(streamID).Lock()
	}

	return orderedStreamIDs
}

// unlockStreams releases locks for the given stream IDs
func (ss *SyncerSet) unlockStreams(streamIDs []StreamId) {
	for _, streamID := range streamIDs {
		lock, ok := ss.streamLocks.LoadAndDelete(streamID)
		if !ok {
			continue
		}
		lock.Unlock()
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

	backfillingFailuresLock := sync.Mutex{}
	backfillingFailures := make([]*SyncStreamOpStatus, 0, len(req.ToAdd))
	backfillingFailuresHandler := func(status *SyncStreamOpStatus) {
		if status.GetCode() != int32(Err_NOT_FOUND) && status.GetCode() != int32(Err_INTERNAL) {
			req.BackfillingFailureHandler(status)
			return
		}

		backfillingFailuresLock.Lock()
		backfillingFailures = append(backfillingFailures, status)
		backfillingFailuresLock.Unlock()
	}

	// First attempt with the provided cookies without modifications.
	if err := ss.modify(ctx, ModifyRequest{
		SyncID:                    req.SyncID,
		ToBackfill:                req.ToBackfill,
		ToAdd:                     req.ToAdd,
		ToRemove:                  req.ToRemove,
		BackfillingFailureHandler: backfillingFailuresHandler,
		AddingFailureHandler:      addingFailuresHandler,
		RemovingFailureHandler:    req.RemovingFailureHandler,
	}); err != nil {
		return err
	}

	// If a stream was failed to process, try to fix the cookies and send the modify sync again.
	// There could be a case when a client specifies a wrong node address which leads to errors.
	// This case should be properly handled by resetting the node address and retrying the operation.
	if len(addingFailures) == 0 && len(backfillingFailures) == 0 {
		return nil
	}

	mr := ModifyRequest{
		ToBackfill:                make([]*ModifySyncRequest_Backfill, 0, len(backfillingFailures)),
		ToAdd:                     make([]*SyncCookie, 0, len(addingFailures)),
		BackfillingFailureHandler: req.BackfillingFailureHandler,
		AddingFailureHandler:      req.AddingFailureHandler,
	}

	// Remove node addresses from failed to backfill streams
	if len(backfillingFailures) > 0 {
		backfills := make(map[string][]*SyncCookie, len(backfillingFailures))
		for _, status := range backfillingFailures {
			var syncID string
			preparedSyncCookie := &SyncCookie{
				StreamId: status.StreamId,
			}
			for _, backfill := range req.ToBackfill {
				for _, cookie := range backfill.GetStreams() {
					if StreamId(cookie.GetStreamId()) == StreamId(status.StreamId) {
						preparedSyncCookie = cookie
						syncID = backfill.GetSyncId()
						break
					}
				}
			}
			preparedSyncCookie.NodeAddress = nil
			if _, ok := backfills[syncID]; !ok {
				backfills[syncID] = []*SyncCookie{preparedSyncCookie}
			} else {
				backfills[syncID] = append(backfills[syncID], preparedSyncCookie)
			}
		}
		for syncID, cookies := range backfills {
			mr.ToBackfill = append(mr.ToBackfill, &ModifySyncRequest_Backfill{
				SyncId:  syncID,
				Streams: cookies,
			})
		}
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

// modify implements the actual modification logic
func (ss *SyncerSet) modify(ctx context.Context, req ModifyRequest) error {
	if ss.stopped.Load() {
		return RiverError(Err_CANCELED, "Sync stopped")
	}

	// Lock all affected streams (excluding backfill streams)
	lockedStreams := ss.lockStreams(req)

	// Group modifications by node address
	modifySyncs := make(map[common.Address]*ModifySyncRequest)

	// Process backfill requests first (wait for locks to be released)
	for _, backfill := range req.ToBackfill {
		for _, cookie := range backfill.GetStreams() {
			streamID := StreamId(cookie.GetStreamId())

			// Wait for the stream to be unlocked with timeout.
			// Parallel operations might lock the given stream by adding or removing it from/to sync.
			if err := ss.waitForStreamUnlock(ctx, streamID); err != nil {
				req.BackfillingFailureHandler(&SyncStreamOpStatus{
					StreamId: streamID[:],
					Code:     int32(Err_UNAVAILABLE),
					Message:  "Stream is temporarily unavailable for syncing",
				})
				continue
			}

			// The given stream must be syncing.
			syncer, found := ss.streamID2Syncer.Load(streamID)
			if !found {
				// Stream is not part of any sync operation, so we can add it to the syncer set.
				req.ToAdd = append(req.ToAdd, cookie)
				lockedStreams = append(lockedStreams, ss.lockStreams(ModifyRequest{ToAdd: []*SyncCookie{cookie}})...)
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
			ss.unlockStreams([]StreamId{streamID})
			lockedStreams = slices.DeleteFunc(lockedStreams, func(id StreamId) bool {
				return id == streamID
			})
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

	ss.unlockStreams(lockedStreams)

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
	var wg sync.WaitGroup
	for nodeAddress, modifySync := range modifySyncs {
		// Get syncer for the given node address
		syncer, err := ss.getOrCreateSyncer(nodeAddress)
		if err != nil {
			rvrErr := AsRiverError(err).Tag("remoteSyncerAddr", nodeAddress)
			for _, cookie := range modifySync.GetBackfillStreams().GetStreams() {
				failedToBackfill(&SyncStreamOpStatus{
					StreamId: cookie.GetStreamId(),
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
			}
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

			ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
			defer cancel()

			resp, _, err := syncer.Modify(ctx, modifySync)
			if err != nil {
				rvrErr := AsRiverError(err, Err_INTERNAL).Tag("remoteSyncerAddr", syncer.Address())
				for _, cookie := range modifySync.GetBackfillStreams().GetStreams() {
					failedToBackfill(&SyncStreamOpStatus{
						StreamId: cookie.GetStreamId(),
						Code:     int32(rvrErr.Code),
						Message:  rvrErr.GetMessage(),
					})
				}
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

			for _, status := range resp.GetBackfills() {
				failedToBackfill(status)
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
		}(modifySync)
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

	syncerStopped, err := syncer.DebugDropStream(ctx, streamID)
	if err != nil {
		return err
	}

	ss.streamID2Syncer.Delete(streamID)
	if syncerStopped {
		ss.muSyncers.Lock()
		delete(ss.syncers, syncer.Address())
		ss.muSyncers.Unlock()
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
		if _, err := ss.getOrCreateSyncer(selectedNode); err == nil {
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
		if _, err = ss.getOrCreateSyncer(ss.localNodeAddress); err == nil {
			return ss.localNodeAddress, true
		}
	}

	// 3. Try remote nodes
	if len(remotes) > 0 {
		selectedNode := stream.GetStickyPeer()
		for range remotes {
			if _, err = ss.getOrCreateSyncer(selectedNode); err == nil {
				return selectedNode, true
			}
			selectedNode = stream.AdvanceStickyPeer(selectedNode)
		}
	}

	return common.Address{}, false
}

// getOrCreateSyncer returns the syncer for the given node address.
// If the syncer does not exist, it creates a new one and starts it.
func (ss *SyncerSet) getOrCreateSyncer(nodeAddress common.Address) (StreamsSyncer, error) {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	if syncer, found := ss.syncers[nodeAddress]; found {
		return syncer, nil
	}

	var syncer StreamsSyncer

	if nodeAddress == ss.localNodeAddress {
		syncer = newLocalSyncer(
			ss.globalCtx,
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

		syncer, err = NewRemoteSyncer(
			ss.globalCtx,
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

	// Check if SyncerSet is stopped before storing the given syncer.
	// There could be a case when the node is stopped while we are trying to create a new syncer
	// and add delta to the wait group. Just return an error in this case.
	if ss.stopped.Load() {
		return nil, RiverError(Err_CANCELED, "Sync stopped")
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
