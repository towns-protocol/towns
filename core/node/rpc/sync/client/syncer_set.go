package client

import (
	"context"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	modifySyncTimeout = 10 * time.Second // Timeout for modifying sync state
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

	// ModifyRequest represents a request to modify the sync state of streams.
	//
	// IMPORTANT: All failure handler callbacks (AddingFailureHandler, RemovingFailureHandler,
	// BackfillingFailureHandler) are invoked while the corresponding stream is locked.
	// These callbacks MUST NOT attempt to lock any stream as this will cause a deadlock.
	// The callbacks should only perform non-blocking operations such as logging or
	// queuing the failure for later processing.
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

// lockStream locks for the given stream ID and returns a function to unlock it.
func (ss *SyncerSet) lockStream(streamID StreamId) func() {
	mutex, _ := ss.streamLocks.LoadOrStore(streamID, &deadlock.Mutex{})
	mutex.Lock()
	return mutex.Unlock
}

// unlockStream releases locks for the given stream ID
func (ss *SyncerSet) unlockStream(streamID StreamId) {
	lock, ok := ss.streamLocks.Load(streamID)
	if !ok {
		return
	}
	lock.Unlock()
}

func (ss *SyncerSet) Modify(ctx context.Context, req ModifyRequest) error {
	if ss.stopped.Load() {
		return RiverError(Err_CANCELED, "Sync stopped")
	}

	var wg sync.WaitGroup

	// Process adding streams
	wg.Add(len(req.ToAdd))
	for _, cookie := range req.ToAdd {
		go func(cookie *SyncCookie) {
			defer wg.Done()

			var st *SyncStreamOpStatus
			ss.processAddingStream(ctx, req.SyncID, cookie, func(status *SyncStreamOpStatus) { st = status }, false)
			if st == nil {
				return
			}

			// Do not retry in specific cases such as if the stream not found or internal error.
			if st.GetCode() != int32(Err_NOT_FOUND) && st.GetCode() != int32(Err_INTERNAL) {
				req.AddingFailureHandler(st)
				return
			}

			// If the first attempt failed, try to force change node address in cookies and send the modify sync again.
			// This sets the node address to the one returned in the failure status to make sure
			// this is not going to be used in the next request.
			// There could be a case when a client specifies a wrong node address which leads to errors.
			// This case should be properly handled by using another node address.
			cookie.NodeAddress = st.GetNodeAddress()
			ss.processAddingStream(ctx, req.SyncID, cookie, req.AddingFailureHandler, true)
		}(cookie)
	}

	// Process backfilling streams
	for _, backfill := range req.ToBackfill {
		for _, cookie := range backfill.GetStreams() {
			wg.Add(1)
			go func(cookie *SyncCookie, backfillSyncID string) {
				defer wg.Done()
				ss.processBackfillingStream(ctx, req.SyncID, backfillSyncID, cookie, req.BackfillingFailureHandler)
			}(cookie, backfill.GetSyncId())
		}
	}

	// Process removing streams
	wg.Add(len(req.ToRemove))
	for _, streamID := range req.ToRemove {
		go func(streamID StreamId) {
			defer wg.Done()
			ss.processRemovingStream(ctx, streamID, req.RemovingFailureHandler)
		}(StreamId(streamID))
	}

	wg.Wait()

	return nil
}

func (ss *SyncerSet) processAddingStream(
	ctx context.Context,
	syncID string,
	cookie *SyncCookie,
	failureHandler func(st *SyncStreamOpStatus),
	changeNode bool,
) {
	streamID := StreamId(cookie.GetStreamId())

	if ss.otelTracer != nil {
		var span trace.Span
		ctx, span = ss.otelTracer.Start(ctx, "syncerset::processAddingStream",
			trace.WithAttributes(attribute.String("streamId", streamID.String())),
			trace.WithAttributes(attribute.String("syncId", syncID)))
		defer span.End()
	}

	unlock := ss.lockStream(streamID)

	if _, found := ss.streamID2Syncer.Load(streamID); found {
		unlock()
		// Backfill the given stream if it is added already.
		ss.processBackfillingStream(ctx, syncID, syncID, cookie, failureHandler)
		return
	}
	defer unlock()

	selectedNode, nodeAvailable := ss.selectNodeForStream(ctx, cookie, changeNode)
	if !nodeAvailable {
		failureHandler(&SyncStreamOpStatus{
			StreamId: streamID[:],
			Code:     int32(Err_UNAVAILABLE),
			Message:  "No available node to sync stream",
		})
		return
	}

	syncer, err := ss.getOrCreateSyncer(ctx, selectedNode)
	if err != nil || syncer == nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", selectedNode)
		failureHandler(&SyncStreamOpStatus{
			StreamId:    cookie.GetStreamId(),
			Code:        int32(rvrErr.Code),
			Message:     rvrErr.GetMessage(),
			NodeAddress: selectedNode.Bytes(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(ctx, modifySyncTimeout)
	defer cancel()

	resp, _, err := syncer.Modify(ctx, &ModifySyncRequest{
		AddStreams: []*SyncCookie{cookie.CopyWithAddr(selectedNode)},
	})
	if err != nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", selectedNode)
		failureHandler(&SyncStreamOpStatus{
			StreamId:    cookie.GetStreamId(),
			Code:        int32(rvrErr.Code),
			Message:     rvrErr.GetMessage(),
			NodeAddress: selectedNode.Bytes(),
		})
		return
	}

	// If the response contains adds, it means the stream was not added successfully.
	if len(resp.GetAdds()) != 0 {
		failureHandler(resp.GetAdds()[0])
	} else {
		ss.streamID2Syncer.Store(StreamId(cookie.GetStreamId()), syncer)
	}
}

func (ss *SyncerSet) processBackfillingStream(
	ctx context.Context,
	syncID string,
	backfillSyncID string,
	cookie *SyncCookie,
	failureHandler func(st *SyncStreamOpStatus),
) {
	streamID := StreamId(cookie.GetStreamId())

	if ss.otelTracer != nil {
		var span trace.Span
		ctx, span = ss.otelTracer.Start(ctx, "syncerset::processBackfillingStream",
			trace.WithAttributes(attribute.String("streamId", streamID.String())),
			trace.WithAttributes(attribute.String("syncId", syncID)),
			trace.WithAttributes(attribute.String("backfillSyncID", backfillSyncID)))
		defer span.End()
	}

	// The given stream must be syncing
	syncer, found := ss.streamID2Syncer.Load(streamID)
	if !found {
		// Another process could have started adding the given stream to sync a bit earlier but did not finish yet.
		// In this case, we should wait for this process to finish.
		// The maximum time we wait is defined by modifySyncTimeout.
		timeout := time.After(modifySyncTimeout)
		for {
			select {
			case <-timeout:
			default:
			}
			time.Sleep(time.Millisecond * 100)
			syncer, found = ss.streamID2Syncer.Load(streamID)
			if found {
				break
			}
		}

		if !found {
			failureHandler(&SyncStreamOpStatus{
				StreamId: streamID[:],
				Code:     int32(Err_NOT_FOUND),
				Message:  "Stream must be syncing to be backfilled",
			})
			return
		}
	}

	ctx, cancel := context.WithTimeout(ctx, modifySyncTimeout)
	defer cancel()

	resp, _, err := syncer.Modify(ctx, &ModifySyncRequest{
		SyncId: syncID,
		BackfillStreams: &ModifySyncRequest_Backfill{
			SyncId:  backfillSyncID,
			Streams: []*SyncCookie{cookie.CopyWithAddr(syncer.Address())},
		},
	})
	if err != nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", syncer.Address())
		failureHandler(&SyncStreamOpStatus{
			StreamId:    cookie.GetStreamId(),
			Code:        int32(rvrErr.Code),
			Message:     rvrErr.GetMessage(),
			NodeAddress: syncer.Address().Bytes(),
		})
		return
	}

	// If the response contains backfills, it means the stream was not backfilled successfully.
	if len(resp.GetBackfills()) != 0 {
		failureHandler(resp.GetBackfills()[0])
	}
}

// processRemovingStream processes the removal of a stream from the syncer.
func (ss *SyncerSet) processRemovingStream(
	ctx context.Context,
	streamID StreamId,
	failureHandler func(st *SyncStreamOpStatus),
) {
	if ss.otelTracer != nil {
		var span trace.Span
		ctx, span = ss.otelTracer.Start(ctx, "syncerset::processRemovingStream",
			trace.WithAttributes(attribute.String("streamId", streamID.String())))
		defer span.End()
	}

	unlock := ss.lockStream(streamID)
	defer unlock()

	syncer, found := ss.streamID2Syncer.Load(streamID)
	if !found {
		return
	}

	ctx, cancel := context.WithTimeout(ctx, modifySyncTimeout)
	defer cancel()

	resp, _, err := syncer.Modify(ctx, &ModifySyncRequest{
		RemoveStreams: [][]byte{streamID[:]},
	})
	if err != nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", syncer.Address())
		failureHandler(&SyncStreamOpStatus{
			StreamId:    streamID[:],
			Code:        int32(rvrErr.Code),
			Message:     rvrErr.GetMessage(),
			NodeAddress: syncer.Address().Bytes(),
		})
		return
	}

	// If the response contains removals, it means the stream was not removed successfully.
	if len(resp.GetRemovals()) != 0 {
		failureHandler(resp.GetRemovals()[0])
	} else {
		ss.streamID2Syncer.Delete(streamID)
	}
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
				if subSpan != nil {
					subSpan.End()
				}
				return selectedNode, true
			} else {
				logging.FromCtx(ss.globalCtx).Errorw("Failed to get or create syncer for remote node",
					"nodeAddress", selectedNode, "streamId", streamID, "error", err)
				if subSpan != nil {
					subSpan.RecordError(err)
					subSpan.SetStatus(codes.Error, err.Error())
					subSpan.End()
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
