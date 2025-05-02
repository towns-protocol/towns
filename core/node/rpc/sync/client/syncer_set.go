package client

import (
	"context"
	"slices"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	"golang.org/x/sync/errgroup"
	"google.golang.org/protobuf/proto"

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
		Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error)
		DebugDropStream(ctx context.Context, streamID StreamId) (bool, error)
	}

	ModifyRequest struct {
		ToAdd                  []*SyncCookie
		ToRemove               [][]byte
		AddingFailureHandler   func(status *SyncStreamOpStatus)
		RemovingFailureHandler func(status *SyncStreamOpStatus)
	}

	Subscription struct {
		ctx      context.Context
		cancel   context.CancelCauseFunc
		syncID   string
		messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	}

	// SyncerSet is the set of StreamsSyncers that are used for a sync operation.
	SyncerSet struct {
		// ctx is the root server context for all syncers in this set and used to cancel them
		ctx context.Context
		// localNodeAddress is the node address for this stream node instance
		localNodeAddress common.Address

		// messages is the channel to which StreamsSyncers write updates that must be sent to the client
		messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
		// subscriptions is a map of all active subscriptions, indexed by the sync ID
		subscriptions *xsync.Map[string, *Subscription]
		// streamSubscriptions is a map of all active subscriptions, indexed by the stream ID
		streamSubscriptions *xsync.Map[StreamId, map[string]struct{}]

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
)

var (
	_ StreamsSyncer = (*localSyncer)(nil)
	_ StreamsSyncer = (*remoteSyncer)(nil)
)

// NewSyncers creates the required syncer set that subscribe on all given cookies.
// A syncer can either be local or remote and writes received events to an internal messages channel from which events
// are streamed to the client.
func NewSyncers(
	ctx context.Context,
	streamCache *StreamCache,
	nodeRegistry nodes.NodeRegistry,
	localNodeAddress common.Address,
	otelTracer trace.Tracer,
) *SyncerSet {
	return &SyncerSet{
		ctx:                 ctx,
		streamCache:         streamCache,
		nodeRegistry:        nodeRegistry,
		localNodeAddress:    localNodeAddress,
		syncers:             make(map[common.Address]StreamsSyncer),
		streamID2Syncer:     make(map[StreamId]StreamsSyncer),
		messages:            dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		subscriptions:       xsync.NewMap[string, *Subscription](),
		streamSubscriptions: xsync.NewMap[StreamId, map[string]struct{}](),
		otelTracer:          otelTracer,
	}
}

// Run starts the sync operation and distributes messages from the syncers to the subscribers.
func (ss *SyncerSet) Run() {
	ss.distributeMessages()

	ss.muSyncers.Lock()
	ss.stopped = true
	ss.muSyncers.Unlock()

	ss.syncerTasks.Wait() // background syncers finished -> safe to close messages channel
}

// NewSubscription creates a new subscription for the given sync ID.
// Returns a message channel that can be used to receive messages from the sync operation.
func (ss *SyncerSet) NewSubscription(
	ctx context.Context,
	cancel context.CancelCauseFunc,
	syncID string,
) *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse] {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	if ss.stopped {
		return nil
	}

	// create a new message channel for the sync operation
	message := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	ss.subscriptions.Store(syncID, &Subscription{
		ctx:      ctx,
		cancel:   cancel,
		syncID:   syncID,
		messages: message,
	})

	return message
}

// TODO: Ignore node address and minipool gen in cookie

// Modify splits the given request into add and remove operations and forwards them to the responsible syncers.
func (ss *SyncerSet) Modify(ctx context.Context, syncID string, req ModifyRequest) error {
	if ss.otelTracer != nil {
		var span trace.Span
		ctx, span = ss.otelTracer.Start(ctx, "Modify",
			trace.WithAttributes(attribute.String("syncID", syncID)))
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

	if err := ss.modify(ctx, syncID, mr); err != nil {
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

	return ss.modify(ctx, syncID, mr)
}

// modify splits the given request into add and remove operations and forwards them to the responsible syncers.
func (ss *SyncerSet) modify(ctx context.Context, syncID string, req ModifyRequest) error {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	if len(req.ToAdd) > 0 && ss.stopped {
		return RiverError(Err_CANCELED, "Sync operation stopped", "syncId", syncID)
	}

	// Prevent passing the same stream to both add and remove operations
	if len(req.ToAdd) > 0 && len(req.ToRemove) > 0 {
		if slices.ContainsFunc(req.ToAdd, func(c *SyncCookie) bool {
			return slices.ContainsFunc(req.ToRemove, func(streamId []byte) bool {
				return StreamId(c.GetStreamId()) == StreamId(streamId)
			})
		}) {
			return RiverError(Err_INVALID_ARGUMENT, "Found the same stream in both add and remove lists").
				Tags("syncId", syncID).
				Func("SyncerSet.Modify")
		}
	}

	modifySyncs := make(map[common.Address]*ModifySyncRequest)

	// Group modify sync request by the remote syncer.
	// Identifying which node to use for the given streams.
	for _, cookie := range req.ToAdd {
		streamID, err := StreamIdFromBytes(cookie.GetStreamId())
		if err != nil {
			return AsRiverError(err).Func("SyncerSet.Modify")
		}

		// Get the given stream from cache
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

		var (
			remotes, isLocal = stream.GetRemotesAndIsLocal()
			selectedNode     common.Address
			nodeAvailable    bool
		)

		// Try node from the cookie first
		if addrRaw := cookie.GetNodeAddress(); len(addrRaw) > 0 {
			selectedNode = common.BytesToAddress(addrRaw)
			if selectedNode.Cmp(ss.localNodeAddress) == 0 && isLocal {
				nodeAvailable = true
			} else if slices.Contains(remotes, selectedNode) {
				if _, err = ss.nodeRegistry.GetStreamServiceClientForAddress(selectedNode); err == nil {
					nodeAvailable = true
				}
			}
		}

		// Fallback only if cookie-provided node is unavailable
		if !nodeAvailable {
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

		// Stream is already part of the sync operation.
		// Resync and add the given subscription to the existing syncer.
		if _, found := ss.streamID2Syncer[streamID]; found {
			if err = ss.startSyncingByCookie(ctx, syncID, cookie.CopyWithAddr(selectedNode)); err != nil {
				rvrErr := AsRiverError(err)
				req.AddingFailureHandler(&SyncStreamOpStatus{
					StreamId: streamID[:],
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
			}
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
				Tags("syncId", syncID, "streamId", streamID).
				Func("SyncerSet.Modify")
		}

		modifySyncs[selectedNode].AddStreams = append(
			modifySyncs[selectedNode].AddStreams,
			cookie.CopyWithAddr(selectedNode),
		)
	}

	// Group remove sync request by the remote syncer.
	// Identifying which node to use for the given streams to remove from sync.
	// The given stream could be removed from the syncer only if there are no other subscriptions for the stream.
	for _, streamIDRaw := range req.ToRemove {
		streamID, err := StreamIdFromBytes(streamIDRaw)
		if err != nil {
			return AsRiverError(err).Func("SyncerSet.Modify")
		}

		// Check if the given stream is already part of the sync operation
		syncer, found := ss.streamID2Syncer[streamID]
		if !found {
			req.RemovingFailureHandler(&SyncStreamOpStatus{
				StreamId: streamID[:],
				Code:     int32(Err_NOT_FOUND),
				Message:  "Stream not part of sync operation",
			})
			continue
		}

		if _, ok := modifySyncs[syncer.Address()]; !ok {
			modifySyncs[syncer.Address()] = &ModifySyncRequest{}
		}

		// Avoid duplicates in the remove list
		if slices.ContainsFunc(modifySyncs[syncer.Address()].RemoveStreams, func(s []byte) bool {
			return streamID == StreamId(s)
		}) {
			return RiverError(Err_ALREADY_EXISTS, "Duplicate stream in remove operation").
				Tags("syncId", syncID, "streamId", streamID).
				Func("SyncerSet.Modify")
		}

		// Add the given stream to the remove list of the syncer only if there are no more subscriptions for the stream.
		// Otherwise, just remote the subscription from the stream.
		if subscribers, ok := ss.streamSubscriptions.Load(streamID); ok && len(subscribers) > 0 {
			if _, ok = subscribers[syncID]; ok && len(subscribers) > 1 {
				ss.removeStreamFromSubscription(syncID, streamID)
				continue
			} else if !ok {
				req.RemovingFailureHandler(&SyncStreamOpStatus{
					StreamId: streamID[:],
					Code:     int32(Err_NOT_FOUND),
					Message:  "Stream not part of sync operation",
				})
				continue
			}
		}

		modifySyncs[syncer.Address()].RemoveStreams = append(
			modifySyncs[syncer.Address()].RemoveStreams,
			streamIDRaw,
		)
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
			if nodeAddress == ss.localNodeAddress {
				syncer = ss.newLocalSyncer()
			} else {
				var err error
				syncer, err = ss.newRemoteSyncer(nodeAddress)
				if err != nil {
					rvrErr := AsRiverError(err).Tag("remoteSyncerAddr", nodeAddress)
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
			}

			ss.syncers[nodeAddress] = syncer
			ss.startSyncer(syncer)
		}

		errGrp.Go(func() error {
			localMuSyncers.Lock()

			// Optimistic add streams in memory
			for _, cc := range modifySync.GetAddStreams() {
				streamID := StreamId(cc.GetStreamId())
				ss.streamID2Syncer[streamID] = syncer
				ss.addStreamToSubscription(syncID, streamID)
			}

			// Optimistic remove streams in memory
			for _, streamIDRaw := range modifySync.GetRemoveStreams() {
				streamID := StreamId(streamIDRaw)
				delete(ss.streamID2Syncer, streamID)
				ss.removeStreamFromSubscription(syncID, streamID)
			}

			localMuSyncers.Unlock()

			ctx, cancel := context.WithTimeout(ctx, time.Second*20)
			defer cancel()

			resp, syncerStopped, err := syncer.Modify(ctx, modifySync)
			if err != nil {
				rvrErr := AsRiverError(err, Err_INTERNAL).Tag("remoteSyncerAddr", syncer.Address())
				for _, cookie := range modifySync.GetAddStreams() {
					streamID := StreamId(cookie.GetStreamId())
					delete(ss.streamID2Syncer, streamID)
					ss.removeStreamFromSubscription(syncID, streamID)

					req.AddingFailureHandler(&SyncStreamOpStatus{
						StreamId: cookie.GetStreamId(),
						Code:     int32(rvrErr.Code),
						Message:  rvrErr.GetMessage(),
					})
				}
				for _, streamIDRaw := range modifySync.GetRemoveStreams() {
					streamID := StreamId(streamIDRaw)
					ss.streamID2Syncer[streamID] = syncer
					ss.addStreamToSubscription(syncID, streamID)

					req.RemovingFailureHandler(&SyncStreamOpStatus{
						StreamId: streamIDRaw,
						Code:     int32(rvrErr.Code),
						Message:  rvrErr.GetMessage(),
					})
				}
				return nil
			}

			localMuSyncers.Lock()

			// Remove streams that were not added
			for _, status := range resp.GetAdds() {
				streamID := StreamId(status.GetStreamId())
				delete(ss.streamID2Syncer, streamID)
				ss.removeStreamFromSubscription(syncID, streamID)
				req.AddingFailureHandler(status)
			}

			// Remove streams that were not removed
			for _, status := range resp.GetRemovals() {
				streamID := StreamId(status.GetStreamId())
				ss.streamID2Syncer[streamID] = syncer
				ss.addStreamToSubscription(syncID, streamID)
				req.RemovingFailureHandler(status)
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

// DebugDropStream drops the given stream from the sync operation.
func (ss *SyncerSet) DebugDropStream(ctx context.Context, syncID string, streamID StreamId) error {
	ss.muSyncers.Lock()
	defer ss.muSyncers.Unlock()

	syncer, found := ss.streamID2Syncer[streamID]
	if !found {
		return RiverError(Err_NOT_FOUND, "Stream not part of sync operation").
			Tags("syncId", syncID, "streamId", streamID)
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

// startSyncingByCookie resyncs the given stream from the given cookie.
// Gets the stream from either local or remote node and sends stream updates to the given subscription.
// This function is called when a new subscription for the given stream is created with a specific cookie but
// the stream is already part of the sync operation and has the latest state so this function loads the stream
// since the given cookie and sends the updates to the subscription.
// The given cookie must contain the node address to use.
func (ss *SyncerSet) startSyncingByCookie(
	ctx context.Context,
	syncID string,
	cookie *SyncCookie,
) error {
	streamID := StreamId(cookie.GetStreamId())

	// Check if the given sync is already subscribed to the given stream.
	subscribers, ok := ss.streamSubscriptions.Load(streamID)
	if ok {
		// Check if the given subscription is already part of the sync operation
		if _, ok = subscribers[syncID]; ok {
			return nil
		}
	}

	if cookie.GetMinipoolGen() > 0 {
		// Get subscription by the given sync ID
		subscription, ok := ss.subscriptions.Load(syncID)
		if !ok {
			return RiverError(Err_NOT_FOUND, "Subscription not found for the given stream").
				Tags("syncId", syncID, "streamID", streamID).Func("startSyncingByCookie")
		}

		// Get stream from either local or remote node
		var sc *StreamAndCookie
		addr := common.BytesToAddress(cookie.GetNodeAddress())
		if addr.Cmp(ss.localNodeAddress) == 0 {
			st, err := ss.streamCache.GetStreamNoWait(ctx, streamID)
			if err != nil {
				return AsRiverError(err).Func("startSyncingByCookie")
			}

			v, err := st.GetViewIfLocal(ctx)
			if err != nil {
				return AsRiverError(err).Func("startSyncingByCookie")
			}

			sc, err = v.GetStreamSince(ctx, ss.localNodeAddress, cookie)
			if err != nil {
				return AsRiverError(err).Func("startSyncingByCookie")
			}
		} else {
			client, err := ss.nodeRegistry.GetStreamServiceClientForAddress(addr)
			if err != nil {
				return AsRiverError(err).Func("startSyncingByCookie")
			}

			resp, err := client.GetStream(ctx, connect.NewRequest(&GetStreamRequest{
				StreamId:   cookie.GetStreamId(),
				SyncCookie: cookie,
			}))
			if err != nil {
				return AsRiverError(err).Func("startSyncingByCookie")
			}

			sc = resp.Msg.GetStream()
		}

		// Send the stream since the given cookie to the subscription
		if err := subscription.messages.AddMessage(&SyncStreamsResponse{
			SyncId:   syncID,
			SyncOp:   SyncOp_SYNC_UPDATE,
			Stream:   sc,
			StreamId: cookie.GetStreamId(),
		}); err != nil {
			return AsRiverError(err).Func("startSyncingByCookie")
		}
	}

	// Add the stream to the subscription
	ss.addStreamToSubscription(syncID, streamID)

	return nil
}

// distributeMessages distributes stream updates from the global sync operation to the individual subscriptions.
func (ss *SyncerSet) distributeMessages() {
	log := logging.FromCtx(ss.ctx)

	cleanSubscriptions := func(err error) {
		if err != nil {
			log.Errorw("Sync operation stopped", "error", err)
		} else {
			log.Info("Sync operation stopped")
		}

		ss.subscriptions.Range(func(_ string, sub *Subscription) bool {
			sub.messages.Close()
			sub.cancel(err)
			return true
		})
		ss.subscriptions.Clear()
		ss.streamSubscriptions.Clear()
	}

	cleanSync := func(syncID string) {
		ss.subscriptions.Delete(syncID)
		ss.streamSubscriptions.Range(func(streamID StreamId, subscriptions map[string]struct{}) bool {
			if _, ok := subscriptions[syncID]; ok {
				delete(subscriptions, syncID)
				if len(subscriptions) == 0 {
					ss.streamSubscriptions.Delete(streamID)
				} else {
					ss.streamSubscriptions.Store(streamID, subscriptions)
				}
			}
			return true
		})
	}

	var msgs []*SyncStreamsResponse
	for {
		select {
		case <-ss.ctx.Done():
			// Global server context is done. Closing all subscriptions.
			cleanSubscriptions(ss.ctx.Err())
			return
		case _, open := <-ss.messages.Wait():
			msgs = ss.messages.GetBatch(msgs)

			// nil msgs indicates the buffer is closed.
			// Closing all subscribers.
			if msgs == nil {
				log.Warnw("SyncerSet global messages channel closed")
				cleanSubscriptions(nil)
				return
			}

			// Create a map of sync ID to messages. This is used to send the messages to the corresponding
			// subscription (clients) in parallel.
			toSend := make(map[string][]*SyncStreamsResponse)
			for _, msg := range msgs {
				streamID := StreamId(msg.GetStreamId())

				if msg.GetSyncOp() == SyncOp_SYNC_CLOSE {
					// TODO: Handle sync close message
				}

				// Get all subscriptions for the given stream.
				syncIDs, ok := ss.streamSubscriptions.Load(streamID)
				if !ok {
					log.Errorw("Received update for the stream with no subscribers", "streamID", streamID)
					continue
				}

				// Order is important here, we need to send the message to all subscribers
				for syncID := range syncIDs {
					toSend[syncID] = append(toSend[syncID], proto.Clone(msg).(*SyncStreamsResponse))
				}
			}

			// Send messages to all subscribers in parallel.
			var wg sync.WaitGroup
			wg.Add(len(toSend))
			for syncID, msgs := range toSend {
				go func(syncID string, msgs []*SyncStreamsResponse) {
					defer wg.Done()

					// Get subscription by the given sync ID
					sub, ok := ss.subscriptions.Load(syncID)
					if !ok {
						log.Errorw("Sync ID provided by no subscription found", "syncID", syncID)
						return
					}

					// Send messages to the given subscriber
					for _, msg := range msgs {
						msg.SyncId = sub.syncID

						// Send message to the subscriber.
						// The given subscriber might be closed, so we need to check if the context is done.
						select {
						case <-sub.ctx.Done():
							// Client closed the connection. Stop sending messages.
							if sub.ctx.Err() != nil {
								log.Errorw("Client closed the connection", "syncID", syncID, "error", sub.ctx.Err())
							} else {
								log.Info("Client closed the connection")
							}
							sub.messages.Close()
							cleanSync(syncID)
							return
						default:
							if err := sub.messages.AddMessage(msg); err != nil {
								log.Errorw("Failed to add message to subscription", "syncID", syncID, "error", err)
								sub.messages.Close()
								sub.cancel(err)
								cleanSync(syncID)
								return
							}
						}
					}
				}(syncID, msgs)
			}
			wg.Wait()

			// Make sure the global server context is not done.
			select {
			case <-ss.ctx.Done():
				// Global server context is done. Closing all subscriptions.
				cleanSubscriptions(ss.ctx.Err())
				return
			default:
			}

			// If the buffer is closed, stop distributing messages to clients.
			// In theory should not happen, but just in case.
			if !open {
				cleanSubscriptions(nil)
				return
			}
		}
	}
}

func (ss *SyncerSet) addStreamToSubscription(
	syncID string,
	streamID StreamId,
) {
	syncIDs, _ := ss.streamSubscriptions.LoadOrStore(streamID, make(map[string]struct{}))
	syncIDs[syncID] = struct{}{}
	ss.streamSubscriptions.Store(streamID, syncIDs)
}

func (ss *SyncerSet) removeStreamFromSubscription(
	syncID string,
	streamID StreamId,
) {
	if syncIDs, ok := ss.streamSubscriptions.Load(streamID); ok {
		delete(syncIDs, syncID)
		if len(syncIDs) == 0 {
			ss.streamSubscriptions.Delete(streamID)
		} else {
			ss.streamSubscriptions.Store(streamID, syncIDs)
		}
	}
}

func (ss *SyncerSet) rmStream(streamID StreamId) {
	ss.muSyncers.Lock()
	delete(ss.streamID2Syncer, streamID)
	ss.muSyncers.Unlock()
}

// newLocalSyncer creates a new local syncer.
func (ss *SyncerSet) newLocalSyncer() StreamsSyncer {
	return newLocalSyncer(ss.ctx, ss.localNodeAddress, ss.streamCache, ss.messages, ss.otelTracer)
}

// newRemoteSyncer returns remote syncer for the given remote node address.
func (ss *SyncerSet) newRemoteSyncer(addr common.Address) (StreamsSyncer, error) {
	client, err := ss.nodeRegistry.GetStreamServiceClientForAddress(addr)
	if err != nil {
		return nil, err
	}

	return newRemoteSyncer(ss.ctx, addr, client, ss.rmStream, ss.messages, ss.otelTracer)
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
