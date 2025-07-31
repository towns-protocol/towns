package syncv3

import (
	"context"
	"slices"
	"sync"

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
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

type (
	Syncer interface {
		Run()
		ID() string
		Address() common.Address
		Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, error)
	}

	SyncerManager interface {
		Modify(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error)
	}

	// syncerWithLock holds a syncer with its associated lock
	syncerWithLock struct {
		Syncer
		deadlock.Mutex
	}

	syncerManager struct {
		// ctx is the global process context.
		ctx context.Context
		// localAddr is the address of the local node.
		localAddr common.Address
		// queue is the queue for commands that can be processed by the syncer manager.
		queue *dynmsgbuf.DynamicBuffer[*command]
		// syncers is the existing set of syncers, indexed by the syncer node address
		syncers *xsync.Map[common.Address, *syncerWithLock]
		// streams is a map of stream IDs to syncers, used to quickly find syncers for specific streams
		streams *xsync.Map[StreamId, *syncerWithLock]
		// nodeRegistry keeps a mapping from node address to node meta-data
		nodeRegistry nodes.NodeRegistry
		// streamCache is the stream cache that holds the streams and their state.
		streamCache StreamCache
		// registry is the registry of sync operations and their state.
		registry Registry
		// otelTracer is used to trace individual sync operations, tracing is disabled if nil
		otelTracer trace.Tracer
	}
)

// NewSyncerManager creates a new syncer manager.
func NewSyncerManager(
	ctx context.Context,
	localAddr common.Address,
	nodeRegistry nodes.NodeRegistry,
	streamCache StreamCache,
	registry Registry,
	otelTracer trace.Tracer,
) SyncerManager {
	m := &syncerManager{
		ctx:          ctx,
		localAddr:    localAddr,
		queue:        dynmsgbuf.NewDynamicBuffer[*command](),
		syncers:      xsync.NewMap[common.Address, *syncerWithLock](),
		streams:      xsync.NewMap[StreamId, *syncerWithLock](),
		nodeRegistry: nodeRegistry,
		streamCache:  streamCache,
		registry:     registry,
		otelTracer:   otelTracer,
	}
	go m.startCommandsProcessor()
	return m
}

func (m *syncerManager) startCommandsProcessor() {
	var wg sync.WaitGroup
	var commands []*command
	for {
		select {
		case <-m.ctx.Done():
			return
		case _, open := <-m.queue.Wait():
			commands = m.queue.GetBatch(commands)

			// nil msgs indicates the buffer is closed.
			if commands == nil {
				// TODO: Log error and skip the rest of commands
				return
			}

			for _, cmd := range commands {
				wg.Add(1)
				go func(cmd *command) {
					defer wg.Done()

					if resp, err := m.modify(cmd.ctx, cmd.req); err != nil {
						cmd.err <- err
					} else {
						cmd.resp <- resp
					}
				}(cmd)
			}
			wg.Wait()

			if !open {
				// TODO: Log error and skip the rest of commands
				// If the queue is closed, we stop processing commands.
				return
			}
		}
	}
}

func (m *syncerManager) Modify(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error) {
	cmd := newCommand(ctx, req)

	// Send the command to the common modify sync queue for processing.
	if err := m.queue.AddMessage(cmd); err != nil {
		return nil, err
	}

	select {
	case <-ctx.Done():
		return nil, AsRiverError(ctx.Err(), Err_CANCELED).Message("context cancelled")
	case err := <-cmd.err:
		return nil, err
	case resp := <-cmd.resp:
		return resp, nil
	}
}

func (m *syncerManager) modify(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error) {
	var wg sync.WaitGroup
	var lock sync.Mutex
	var resp ModifySyncResponse

	// Process adding streams
	wg.Add(len(req.GetAddStreams()))
	for _, cookie := range req.GetAddStreams() {
		go func(cookie *SyncCookie) {
			defer wg.Done()

			// 1. Process adding stream to sync with the given cookie.
			// The node address specified in cookie is used to select the node for the syncer.
			st := m.processAddingStream(ctx, cookie, false)
			if st == nil {
				return
			}

			// Do not retry in specific cases such as if the stream not found or internal error.
			if st.GetCode() == int32(Err_NOT_FOUND) || st.GetCode() == int32(Err_INTERNAL) {
				// 2. If the first attempt failed, try to force change node address in cookies and send the modify sync again.
				// This sets the node address to the one returned in the failure status to make sure
				// this is not going to be used in the next request.
				// There could be a case when a client specifies a wrong node address which leads to errors.
				// This case should be properly handled by using another node address.
				cookie.NodeAddress = st.GetNodeAddress()
				st = m.processAddingStream(ctx, cookie, true)
			} else if st.GetCode() == int32(Err_ALREADY_EXISTS) {
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

	wg.Wait()

	return &resp, nil
}

func (m *syncerManager) processAddingStream(
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

	selectedNode, nodeAvailable := m.selectNodeForStream(ctx, cookie, changeNode)
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
			StreamId:    cookie.GetStreamId(),
			Code:        int32(rvrErr.Code),
			Message:     rvrErr.GetMessage(),
			NodeAddress: selectedNode.Bytes(),
		}
	}

	resp, err := syncer.Modify(ctx, &ModifySyncRequest{
		AddStreams: []*SyncCookie{cookie.CopyWithAddr(selectedNode)},
	})
	if err != nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", selectedNode)
		return &SyncStreamOpStatus{
			StreamId:    cookie.GetStreamId(),
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
func (m *syncerManager) processRemovingStream(
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

func (m *syncerManager) processBackfillingStream(
	ctx context.Context,
	syncID string,
	backfillSyncID string,
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

	resp, err := syncer.Modify(ctx, &ModifySyncRequest{
		SyncId: syncID,
		BackfillStreams: &ModifySyncRequest_Backfill{
			SyncId:  backfillSyncID,
			Streams: []*SyncCookie{cookie.CopyWithAddr(syncer.Address())},
		},
	})
	if err != nil {
		rvrErr := AsRiverError(err).Tag("nodeAddr", syncer.Address())
		return &SyncStreamOpStatus{
			StreamId:    cookie.GetStreamId(),
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
func (m *syncerManager) selectNodeForStream(ctx context.Context, cookie *SyncCookie, changeNode bool) (common.Address, bool) {
	streamID := StreamId(cookie.GetStreamId())
	usedNode := common.BytesToAddress(cookie.GetNodeAddress())

	var span trace.Span
	if m.otelTracer != nil {
		ctx, span = m.otelTracer.Start(ctx, "syncerset::selectNodeForStream",
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
			if _, err := m.getOrCreateSyncer(ctx, selectedNode); err == nil {
				return selectedNode, true
			} else {
				logging.FromCtx(m.ctx).Errorw("Failed to get or create syncer for node from cookie",
					"nodeAddress", selectedNode, "streamId", streamID, "error", err)
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
	if isLocal && (!changeNode || m.localAddr != usedNode) {
		if _, err = m.getOrCreateSyncer(ctx, m.localAddr); err == nil {
			return m.localAddr, true
		} else {
			logging.FromCtx(m.ctx).Errorw("Failed to get or create local syncer for node",
				"nodeAddress", m.localAddr, "streamId", streamID, "error", err)
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
func (m *syncerManager) getOrCreateSyncer(ctx context.Context, nodeAddress common.Address) (Syncer, error) {
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
			m.streamCache,
			m.registry,
			m.onStreamDown,
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
			m.onStreamDown,
			m.registry,
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

// onStreamDown is called when a stream is no longer syncing, e.g., due to node outage or other reasons.
// FIXME: RACE CONDITION WHEN ONE PROCESS IS ADDING STREAM AND THIS FUNCTION IS CALLED.
func (m *syncerManager) onStreamDown(streamID StreamId) {
	m.registry.RemoveStream(streamID)

	syncerEntity, loaded := m.streams.Load(streamID)
	if !loaded {
		return
	}

	syncerEntity.Lock()
	syncerEntity.Syncer = nil
	syncerEntity.Unlock()
}
