package client

import (
	"context"
	"slices"
	"sync"
	"time"

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

func (ss *SyncerSet) AddStream(ctx context.Context, cookie *SyncCookie) error {
	streamID, err := StreamIdFromBytes(cookie.GetStreamId())
	if err != nil {
		return err
	}

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

	// Try node from the cookie first
	nodeAddress := common.BytesToAddress(cookie.GetNodeAddress())
	if nodeAddress.Cmp(common.Address{}) != 0 {
		if err = ss.attemptAddStream(ctx, nodeAddress, cookie, streamID); err == nil {
			return nil
		}
		// If forwarding fails, proceed to load stream and retry
	}

	stream, err := ss.streamCache.GetStreamNoWait(ctx, streamID)
	if err != nil {
		return err
	}

	// Try using the local node if the stream is local
	remotes, useLocal := stream.GetRemotesAndIsLocal()
	if useLocal {
		nodeAddress = ss.localNodeAddress
		if err = ss.attemptAddStream(ctx, nodeAddress, cookie, streamID); err == nil {
			return nil
		}
	}

	// Try using the remote nodes
	stickyNode := stream.GetStickyPeer()
	for range remotes {
		if err = ss.attemptAddStream(ctx, stickyNode, cookie, streamID); err == nil {
			return nil
		}
		stickyNode = stream.AdvanceStickyPeer(stickyNode)
	}

	return RiverError(Err_UNAVAILABLE, "Unable to create syncer for stream", "streamId", streamID)
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
	if ss.otelTracer != nil {
		var span trace.Span
		ctx, span = ss.otelTracer.Start(ctx, "Modify",
			trace.WithAttributes(attribute.String("syncID", ss.syncID)))
		defer span.End()
	}

	addingFailuresLock := sync.Mutex{}
	addingFailures := make([]*SyncStreamOpStatus, 0, len(req.ToAdd))
	mr := ModifyRequest{
		ToAdd:    req.ToAdd,
		ToRemove: req.ToRemove,
		AddingFailureHandler: func(status *SyncStreamOpStatus) {
			if status.GetCode() != int32(Err_NOT_FOUND) && status.GetCode() != int32(Err_INTERNAL) {
				req.AddingFailureHandler(status)
				return
			}

			addingFailuresLock.Lock()
			addingFailures = append(addingFailures, status)
			addingFailuresLock.Unlock()
		},
		RemovingFailureHandler: req.RemovingFailureHandler,
	}

	if err := ss.modify(ctx, mr); err != nil {
		return err
	}

	// If a stream was failed to add, try to fix the cookies and send the modify sync again.
	// There could be a case when a client specifies a wrong node address which leads to errors.
	// This case should be properly handled by resetting the node address and retrying the operation.
	if len(addingFailures) == 0 {
		return nil
	}

	mr = ModifyRequest{
		ToAdd:                make([]*SyncCookie, 0, len(addingFailures)),
		AddingFailureHandler: req.AddingFailureHandler,
	}

	// Remove node addresses from failed to add streams
	for _, status := range addingFailures {
		if status.GetCode() != int32(Err_NOT_FOUND) && status.GetCode() != int32(Err_INTERNAL) {
			continue
		}

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
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	if len(req.ToAdd) > 0 && ss.stopped {
		return RiverError(Err_CANCELED, "Sync operation stopped", "syncId", ss.syncID)
	}

	// Prevent passing the same stream to both add and remove operations
	if len(req.ToAdd) > 0 && len(req.ToRemove) > 0 {
		if slices.ContainsFunc(req.ToAdd, func(c *SyncCookie) bool {
			return slices.ContainsFunc(req.ToRemove, func(streamId []byte) bool {
				return StreamId(c.GetStreamId()) == StreamId(streamId)
			})
		}) {
			return RiverError(Err_INVALID_ARGUMENT, "Found the same stream in both add and remove lists").
				Tags("syncId", ss.syncID).
				Func("SyncerSet.Modify")
		}
	}

	modifySyncs := make(map[common.Address]*ModifySyncRequest)

	// group cookies by node address
	for _, cookie := range req.ToAdd {
		streamID := StreamId(cookie.GetStreamId())
		if _, found := ss.streamID2Syncer[streamID]; found {
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

		// Fallback only if cookie-provided node is unavailable
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

		// avoid duplicates
		if slices.ContainsFunc(modifySyncs[selectedNode].AddStreams, func(c *SyncCookie) bool {
			return StreamId(c.StreamId) == streamID
		}) {
			return RiverError(Err_ALREADY_EXISTS, "Duplicate stream in add operation").
				Tags("syncId", ss.syncID, "streamId", streamID).
				Func("SyncerSet.Modify")
		}

		modifySyncs[selectedNode].AddStreams = append(
			modifySyncs[selectedNode].AddStreams,
			cookie.CopyWithAddr(selectedNode),
		)
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

		// avoid duplicates in the remove list
		if slices.ContainsFunc(modifySyncs[syncer.Address()].RemoveStreams, func(s []byte) bool {
			return StreamId(streamIDRaw) == StreamId(s)
		}) {
			return RiverError(Err_ALREADY_EXISTS, "Duplicate stream in remove operation").
				Tags("syncId", ss.syncID, "streamId", StreamId(streamIDRaw)).
				Func("SyncerSet.Modify")
		}

		modifySyncs[syncer.Address()].RemoveStreams = append(modifySyncs[syncer.Address()].RemoveStreams, streamIDRaw)
	}

	if len(modifySyncs) == 0 {
		return nil
	}

	var errGrp errgroup.Group
	var localMuSyncers sync.Mutex
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
			ctx, cancel := context.WithTimeout(ctx, time.Second*20)
			defer cancel()

			resp, syncerStopped, err := syncer.Modify(ctx, modifySync)
			if err != nil {
				for _, cookie := range modifySync.GetAddStreams() {
					req.AddingFailureHandler(&SyncStreamOpStatus{
						StreamId: cookie.GetStreamId(),
						Code:     int32(Err_INTERNAL),
						Message:  err.Error(),
					})
				}
				for _, streamIDRaw := range modifySync.GetRemoveStreams() {
					req.RemovingFailureHandler(&SyncStreamOpStatus{
						StreamId: streamIDRaw,
						Code:     int32(Err_INTERNAL),
						Message:  err.Error(),
					})
				}
				return nil
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

			removalFailures := resp.GetRemovals()
			successfullyRemoved := slices.DeleteFunc(modifySync.GetRemoveStreams(), func(streamIdRaw []byte) bool {
				return slices.ContainsFunc(removalFailures, func(status *SyncStreamOpStatus) bool {
					return StreamId(status.StreamId) == StreamId(streamIdRaw)
				})
			})
			for _, status := range removalFailures {
				req.RemovingFailureHandler(status)
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

func (ss *SyncerSet) attemptAddStream(ctx context.Context, nodeAddress common.Address, cookie *SyncCookie, streamID StreamId) error {
	ctx, cancel := context.WithTimeout(ctx, time.Second*5)
	defer cancel()

	if syncer, found := ss.syncers[nodeAddress]; found {
		if err := syncer.AddStream(ctx, cookie.CopyWithAddr(nodeAddress)); err != nil {
			return err
		}
		ss.streamID2Syncer[streamID] = syncer
		return nil
	}

	var (
		syncer StreamsSyncer
		span   trace.Span
		err    error
	)
	if nodeAddress == ss.localNodeAddress {
		if ss.otelTracer != nil {
			_, span = ss.otelTracer.Start(ctx, "NewLocalSyncer",
				trace.WithAttributes(attribute.String("stream", streamID.String())))
		}
		syncer, err = ss.newLocalSyncer([]*SyncCookie{cookie.CopyWithAddr(nodeAddress)})
	} else {
		if ss.otelTracer != nil {
			_, span = ss.otelTracer.Start(ctx, "NewRemoteSyncer",
				trace.WithAttributes(attribute.String("stream", streamID.String()),
					attribute.String("remote", nodeAddress.String())))
		}
		syncer, err = ss.newRemoteSyncer(nodeAddress, []*SyncCookie{cookie.CopyWithAddr(nodeAddress)})
	}
	if span != nil {
		span.End()
	}
	if err != nil {
		return err
	}

	ss.syncers[nodeAddress] = syncer
	ss.streamID2Syncer[streamID] = syncer
	ss.startSyncer(syncer)

	return nil
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
