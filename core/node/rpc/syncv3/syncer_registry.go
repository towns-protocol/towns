package syncv3

import (
	"context"
	"math"
	"slices"
	"sync"
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
	// modifySyncTimeout is the timeout for modifying sync op with a SINGLE item/stream in it.
	modifySyncTimeout = 15 * time.Second
)

type (
	// Syncer represents a behavior of a syncer entity responsible for managing stream updates.
	Syncer interface {
		Run()
		ID() string
		Address() common.Address
		Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, error)
	}

	// SyncerRegistry is an interface that defines the behavior of a syncer registry.
	// It is responsible for managing syncers and processing modify sync requests.
	SyncerRegistry interface {
		Modify(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error)
		RemoveStream(streamID StreamId)
	}

	// syncerWithLock holds a syncer with its associated lock
	syncerWithLock struct {
		Syncer
		deadlock.Mutex
	}

	// syncerRegistry implements the SyncerRegistry interface.
	syncerRegistry struct {
		// ctx is the global process context.
		ctx context.Context
		// localAddr is the address of the local node.
		localAddr common.Address
		// eventBus is the event bus that processes messages.
		eventBus EventBus[EventBusMessage]
		// syncers is the existing set of syncers, indexed by the syncer node address
		syncers *xsync.Map[common.Address, *syncerWithLock]
		// streams is a map of stream IDs to syncers, used to quickly find syncers for specific streams
		streams *xsync.Map[StreamId, *syncerWithLock]
		// nodeRegistry keeps a mapping from node address to node meta-data
		nodeRegistry nodes.NodeRegistry
		// streamCache is the stream cache that holds the streams and their state.
		streamCache StreamCache
		// otelTracer is used to trace individual sync operations, tracing is disabled if nil
		otelTracer trace.Tracer
	}
)

// NewSyncerRegistry creates a new syncer registry.
func NewSyncerRegistry(
	ctx context.Context,
	localAddr common.Address,
	eventBus EventBus[EventBusMessage],
	nodeRegistry nodes.NodeRegistry,
	streamCache StreamCache,
	otelTracer trace.Tracer,
) SyncerRegistry {
	return &syncerRegistry{
		ctx:          ctx,
		localAddr:    localAddr,
		eventBus:     eventBus,
		syncers:      xsync.NewMap[common.Address, *syncerWithLock](),
		streams:      xsync.NewMap[StreamId, *syncerWithLock](),
		nodeRegistry: nodeRegistry,
		streamCache:  streamCache,
		otelTracer:   otelTracer,
	}
}

func (m *syncerRegistry) Modify(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error) {
	var wg sync.WaitGroup
	var lock sync.Mutex
	var resp ModifySyncResponse

	// Process adding streams
	wg.Add(len(req.GetAddStreams()))
	for _, cookie := range req.GetAddStreams() {
		go func(cookie *SyncCookie) {
			defer wg.Done()

			// There are some edge cases when cookie can be nil. Do nothing, just skip instead of panicing.
			if cookie == nil {
				return
			}

			// 1. Process adding stream to sync with the given cookie.
			// The node address specified in cookie is used to select the node for the syncer.
			st := m.processAddingStream(ctx, &SyncCookie{
				NodeAddress:       cookie.GetNodeAddress(),
				StreamId:          cookie.GetStreamId(),
				MinipoolGen:       math.MaxInt64,
				PrevMiniblockHash: common.Hash{}.Bytes(),
			}, false)
			if st == nil {
				return
			}

			// Do not retry in specific cases such as if the stream not found or internal error.
			if st.GetCode() == int32(Err_NOT_FOUND) || // Stream not found on the selected node
				st.GetCode() == int32(Err_DEADLINE_EXCEEDED) || // The selected node is not responding in time
				st.GetCode() == int32(Err_INTERNAL) { // There is some internal error on the selected node
				// 2. If the first attempt failed, try to force change node address in cookies and send the modify sync again.
				// This sets the node address to the one returned in the failure status to make sure
				// this is not going to be used in the next request.
				// There could be a case when a client specifies a wrong node address which leads to errors.
				// This case should be properly handled by using another node address.
				st = m.processAddingStream(ctx, &SyncCookie{
					NodeAddress:       st.GetNodeAddress(),
					StreamId:          cookie.GetStreamId(),
					MinipoolGen:       math.MaxInt64,
					PrevMiniblockHash: common.Hash{}.Bytes(),
				}, true)
			}

			if st.GetCode() == int32(Err_ALREADY_EXISTS) {
				// 3. If the stream is already being synced, we need to backfill it.
				st = m.processBackfillingStream(ctx, req.GetSyncId(), req.GetSyncId(), cookie)
			}

			if st != nil {
				lock.Lock()
				resp.Adds = append(resp.Adds, st)
				lock.Unlock()
			}
		}(cookie)
	}

	// Process removing streams
	wg.Add(len(req.GetRemoveStreams()))
	for _, streamID := range req.GetRemoveStreams() {
		go func(streamID StreamId) {
			defer wg.Done()
			if st := m.processRemovingStream(ctx, streamID); st != nil {
				lock.Lock()
				resp.Removals = append(resp.Removals, st)
				lock.Unlock()
			}
		}(StreamId(streamID))
	}

	// Process backfilling streams
	wg.Add(len(req.GetBackfillStreams().GetStreams()))
	for _, cookie := range req.GetBackfillStreams().GetStreams() {
		go func(cookie *SyncCookie) {
			defer wg.Done()

			// There are some edge cases when cookie can be nil. Do nothing, just skip instead of panicing.
			if cookie == nil {
				return
			}

			st := m.processBackfillingStream(ctx, req.GetSyncId(), req.GetBackfillStreams().GetSyncId(), cookie)
			if st != nil {
				lock.Lock()
				resp.Backfills = append(resp.Backfills, st)
				lock.Unlock()
			}
		}(cookie)
	}

	wg.Wait()

	return &resp, nil
}

func (m *syncerRegistry) processAddingStream(
	ctx context.Context,
	cookie *SyncCookie,
	changeNode bool,
) *SyncStreamOpStatus {
	streamID := StreamId(cookie.GetStreamId())

	syncerEntity, _ := m.streams.LoadOrStore(streamID, &syncerWithLock{})

	syncerEntity.Lock()
	defer syncerEntity.Unlock()

	// If the syncer is already set, it means the stream is already being synced.
	if syncerEntity.Syncer != nil {
		return &SyncStreamOpStatus{
			StreamId: streamID[:],
			Code:     int32(Err_ALREADY_EXISTS),
			Message:  "Stream is already being synced",
		}
	}

	selectedNode, nodeAvailable := m.selectNodeForStream(
		ctx,
		StreamId(cookie.GetStreamId()),
		common.BytesToAddress(cookie.GetNodeAddress()),
		changeNode,
	)
	if !nodeAvailable {
		return &SyncStreamOpStatus{
			StreamId: streamID[:],
			Code:     int32(Err_UNAVAILABLE),
			Message:  "No available node to sync stream",
		}
	}

	syncer, err := m.getOrCreateSyncer(ctx, selectedNode)
	if err != nil || syncer == nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", selectedNode)
		return &SyncStreamOpStatus{
			StreamId:    streamID[:],
			Code:        int32(rvrErr.Code),
			Message:     rvrErr.GetMessage(),
			NodeAddress: selectedNode.Bytes(),
		}
	}

	ctx, cancel := context.WithTimeout(ctx, modifySyncTimeout)
	defer cancel()

	resp, err := syncer.Modify(ctx, &ModifySyncRequest{
		AddStreams: []*SyncCookie{cookie.CopyWithAddr(selectedNode)},
	})
	if err != nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", selectedNode)
		return &SyncStreamOpStatus{
			StreamId:    streamID[:],
			Code:        int32(rvrErr.Code),
			Message:     rvrErr.GetMessage(),
			NodeAddress: selectedNode.Bytes(),
		}
	}

	// If the response contains adds, it means the stream was not added successfully.
	if len(resp.GetAdds()) != 0 {
		return resp.GetAdds()[0]
	}

	syncerEntity.Syncer = syncer

	return nil
}

// processRemovingStream processes the removal of a stream from the syncer.
func (m *syncerRegistry) processRemovingStream(
	ctx context.Context,
	streamID StreamId,
) *SyncStreamOpStatus {
	syncerEntity, found := m.streams.Load(streamID)
	if !found {
		return nil
	}

	syncerEntity.Lock()
	defer syncerEntity.Unlock()

	// If the syncer is nil, it means the stream is not being synced anymore.
	if syncerEntity.Syncer == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, modifySyncTimeout)
	defer cancel()

	resp, err := syncerEntity.Modify(ctx, &ModifySyncRequest{
		RemoveStreams: [][]byte{streamID[:]},
	})
	if err != nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", syncerEntity.Address())
		return &SyncStreamOpStatus{
			StreamId:    streamID[:],
			Code:        int32(rvrErr.Code),
			Message:     rvrErr.GetMessage(),
			NodeAddress: syncerEntity.Address().Bytes(),
		}
	}

	// If the response contains removals, it means the stream was not removed successfully.
	if len(resp.GetRemovals()) != 0 {
		return resp.GetRemovals()[0]
	}

	syncerEntity.Syncer = nil

	return nil
}

func (m *syncerRegistry) processBackfillingStream(
	ctx context.Context,
	syncID string,
	targetSyncID string,
	cookie *SyncCookie,
) *SyncStreamOpStatus {
	streamID := StreamId(cookie.GetStreamId())

	// The given stream must be syncing
	syncerEntity, found := m.streams.Load(streamID)
	if !found {
		return &SyncStreamOpStatus{
			StreamId: streamID[:],
			Code:     int32(Err_NOT_FOUND),
			Message:  "Stream must be syncing to be backfilled",
		}
	}

	syncerEntity.Lock()
	syncer := syncerEntity.Syncer
	syncerEntity.Unlock()

	if syncer == nil {
		return &SyncStreamOpStatus{
			StreamId: streamID[:],
			Code:     int32(Err_NOT_FOUND),
			Message:  "Stream must be syncing to be backfilled",
		}
	}

	ctx, cancel := context.WithTimeout(ctx, modifySyncTimeout)
	defer cancel()

	resp, err := syncer.Modify(ctx, &ModifySyncRequest{
		SyncId: syncID,
		BackfillStreams: &ModifySyncRequest_Backfill{
			SyncId:  targetSyncID,
			Streams: []*SyncCookie{cookie.CopyWithAddr(syncer.Address())},
		},
	})
	if err != nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", syncer.Address())
		return &SyncStreamOpStatus{
			StreamId:    streamID[:],
			Code:        int32(rvrErr.Code),
			Message:     rvrErr.GetMessage(),
			NodeAddress: syncer.Address().Bytes(),
		}
	}

	// If the response contains backfills, it means the stream was not backfilled successfully.
	if len(resp.GetBackfills()) != 0 {
		return resp.GetBackfills()[0]
	}

	return nil
}

// selectNodeForStream attempts to find an available node for the given stream in the following order:
// 1. Node specified in the cookie (if any)
// 2. Local node (if stream is local)
// 3. Remote nodes (in order of preference)
// Extra logic is applied if changeNode is true, which means that the node from the cookie should not be used.
// Returns the selected node address and true if a node was found and available, false otherwise.
// Initializes syncer for the selected node if it does not exist yet.
func (m *syncerRegistry) selectNodeForStream(
	ctx context.Context,
	streamID StreamId,
	node common.Address,
	changeNode bool,
) (common.Address, bool) {
	var span trace.Span
	if m.otelTracer != nil {
		ctx, span = m.otelTracer.Start(ctx, "syncerset::selectNodeForStream",
			trace.WithAttributes(
				attribute.Bool("changeNode", changeNode),
				attribute.String("targetNode", node.Hex()),
				attribute.String("streamID", streamID.String())))
		defer span.End()
	}

	// 1. Try node from cookie first
	if !changeNode {
		if node.Cmp(common.Address{}) != 0 {
			if _, err := m.getOrCreateSyncer(ctx, node); err == nil {
				return node, true
			} else {
				logging.FromCtx(m.ctx).Errorw("Failed to get or create syncer for node from cookie",
					"nodeAddress", node, "streamId", streamID, "error", err)
			}
		}
	}

	stream, err := m.streamCache.GetStreamNoWait(ctx, streamID)
	if err != nil {
		logging.FromCtx(m.ctx).Errorw("Failed to get stream from cache for syncer selection",
			"streamId", streamID, "error", err)
		if span != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
		}
		return common.Address{}, false
	}

	// 2. Try local node if stream is local
	remotes, isLocal := stream.GetRemotesAndIsLocal()
	if isLocal && (!changeNode || m.localAddr != node) {
		if _, err = m.getOrCreateSyncer(ctx, m.localAddr); err == nil {
			return m.localAddr, true
		} else {
			logging.FromCtx(m.ctx).Errorw("Failed to get or create local syncer for node",
				"nodeAddress", m.localAddr, "streamId", streamID, "error", err)
		}
	}

	// If changeNode is true, we should not use the usedNode address
	if changeNode {
		remotes = slices.DeleteFunc(remotes, func(addr common.Address) bool { return addr == node })
	}

	// 3. Try remote nodes
	if len(remotes) > 0 {
		selectedNode := stream.GetStickyPeer()
		for range remotes {
			var subSpan trace.Span
			remoteCtx := ctx
			if m.otelTracer != nil {
				remoteCtx, subSpan = m.otelTracer.Start(ctx, "syncerset::selectNodeForStream::remote",
					trace.WithAttributes(attribute.String("selectedNode", selectedNode.String())))
			}

			if _, err = m.getOrCreateSyncer(remoteCtx, selectedNode); err == nil {
				if subSpan != nil {
					subSpan.End()
				}
				return selectedNode, true
			} else {
				logging.FromCtx(m.ctx).Errorw("Failed to get or create syncer for remote node",
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
func (m *syncerRegistry) getOrCreateSyncer(ctx context.Context, nodeAddress common.Address) (Syncer, error) {
	syncerEntity, _ := m.syncers.LoadOrStore(nodeAddress, &syncerWithLock{})

	// Lock the syncer for initialization check/creation
	syncerEntity.Lock()
	defer syncerEntity.Unlock()

	// Check if already initialized (by us or another goroutine)
	if syncerEntity.Syncer != nil {
		return syncerEntity.Syncer, nil
	}

	var syncer Syncer
	if nodeAddress == m.localAddr {
		syncer = NewLocalSyncer(
			m.ctx,
			m.localAddr,
			m.eventBus,
			m.streamCache,
			m.otelTracer,
		)
	} else {
		client, err := m.nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
		if err != nil {
			return nil, err
		}

		syncer, err = NewRemoteSyncer(
			m.ctx,
			nodeAddress,
			client,
			m.eventBus,
			m.otelTracer,
		)
		if err != nil {
			return nil, err
		}
	}

	syncerEntity.Syncer = syncer

	// Start the syncer and reset it to nil when it stops
	go func() {
		syncer.Run()
		syncerEntity.Lock()
		syncerEntity.Syncer = nil
		syncerEntity.Unlock()
	}()

	return syncer, nil
}

// RemoveStream is called when a stream the stream down message is received.
// This function called by event bus.
// TODO: Requires extra logic to properly handle node issues.
func (m *syncerRegistry) RemoveStream(streamID StreamId) {
	syncerEntity, loaded := m.streams.Load(streamID)
	if !loaded {
		return
	}

	syncerEntity.Lock()
	syncerEntity.Syncer = nil
	syncerEntity.Unlock()
}
