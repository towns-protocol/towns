package client

import (
	"context"
	"fmt"
	"slices"
	"sync"
	"time"

	"github.com/puzpuzpuz/xsync/v4"

	"github.com/towns-protocol/towns/core/node/logging"

	"google.golang.org/protobuf/proto"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	"golang.org/x/sync/errgroup"

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
		// streamToSubscriptions is a map of all active subscriptions, indexed by the stream ID
		streamToSubscriptions *xsync.Map[StreamId, map[string]struct{}]

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
		ctx:                   ctx,
		streamCache:           streamCache,
		nodeRegistry:          nodeRegistry,
		localNodeAddress:      localNodeAddress,
		syncers:               make(map[common.Address]StreamsSyncer),
		streamID2Syncer:       make(map[StreamId]StreamsSyncer),
		messages:              dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		subscriptions:         xsync.NewMap[string, *Subscription](),
		streamToSubscriptions: xsync.NewMap[StreamId, map[string]struct{}](),
		otelTracer:            otelTracer,
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
				if client, err := ss.nodeRegistry.GetStreamServiceClientForAddress(selectedNode); err == nil {
					if _, err = client.Info(ctx, connect.NewRequest(&InfoRequest{})); err == nil {
						nodeAvailable = true
					}
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
					if client, err := ss.nodeRegistry.GetStreamServiceClientForAddress(selectedNode); err == nil {
						if _, err = client.Info(ctx, connect.NewRequest(&InfoRequest{})); err == nil {
							nodeAvailable = true
							break
						}
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
				Tags("syncId", syncID, "streamId", StreamId(streamIDRaw)).
				Func("SyncerSet.Modify")
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

				syncIDs, _ := ss.streamToSubscriptions.LoadOrStore(streamID, make(map[string]struct{}))
				syncIDs[syncID] = struct{}{}
				ss.streamToSubscriptions.Store(streamID, syncIDs)
			}

			// Optimistic remove streams in memory
			for _, streamIDRaw := range modifySync.GetRemoveStreams() {
				streamID := StreamId(streamIDRaw)
				delete(ss.streamID2Syncer, streamID)

				if syncIDs, ok := ss.streamToSubscriptions.Load(streamID); ok {
					delete(syncIDs, syncID)
					if len(syncIDs) == 0 {
						ss.streamToSubscriptions.Delete(streamID)
					} else {
						ss.streamToSubscriptions.Store(streamID, syncIDs)
					}
				}
			}

			localMuSyncers.Unlock()

			ctx, cancel := context.WithTimeout(ctx, time.Second*20)
			defer cancel()

			resp, syncerStopped, err := syncer.Modify(ctx, modifySync)
			if err != nil {
				rvrErr := AsRiverError(err, Err_INTERNAL).Tag("remoteSyncerAddr", syncer.Address())
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
				return nil
			}

			localMuSyncers.Lock()

			// Remove streams that were not added
			for _, status := range resp.GetAdds() {
				streamID := StreamId(status.GetStreamId())
				delete(ss.streamID2Syncer, streamID)

				if syncIDs, ok := ss.streamToSubscriptions.Load(streamID); ok {
					delete(syncIDs, syncID)
					if len(syncIDs) == 0 {
						ss.streamToSubscriptions.Delete(streamID)
					} else {
						ss.streamToSubscriptions.Store(streamID, syncIDs)
					}
				}

				req.AddingFailureHandler(status)
			}

			// Remove streams that were not removed
			for _, status := range resp.GetRemovals() {
				streamID := StreamId(status.GetStreamId())
				ss.streamID2Syncer[streamID] = syncer

				syncIDs, _ := ss.streamToSubscriptions.LoadOrStore(streamID, make(map[string]struct{}))
				syncIDs[syncID] = struct{}{}
				ss.streamToSubscriptions.Store(streamID, syncIDs)

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

// distributeMessages distributes stream updates from the global sync operation to the individual subscriptions.
func (ss *SyncerSet) distributeMessages() {
	log := logging.FromCtx(ss.ctx)

	var msgs []*SyncStreamsResponse
	for {
		select {
		case <-ss.ctx.Done():
			err := context.Cause(ss.ctx)
			if err != nil {
				log.Errorw("Sync operation stopped", "err", err)
			} else {
				log.Debug("Sync operation stopped")
			}
			ss.subscriptions.Range(func(_ string, sub *Subscription) bool {
				sub.messages.Close()
				sub.cancel(err)
				return true
			})
			ss.subscriptions.Clear()
			return
		case _, open := <-ss.messages.Wait():
			msgs = ss.messages.GetBatch(msgs)

			// nil msgs indicates the buffer is closed
			// closing all subscribers
			if msgs == nil {
				log.Warnw("SyncerSet global messages channel closed")
				ss.subscriptions.Range(func(_ string, sub *Subscription) bool {
					sub.messages.Close()
					sub.cancel(nil)
					return true
				})
				ss.subscriptions.Clear()
				return
			}

			// Create a map of sync IDs to messages
			toSend := make(map[string][]*SyncStreamsResponse)
			for _, msg := range msgs {
				streamID := StreamId(msg.GetStreamId())

				// Get all sync IDs
				syncIDs, ok := ss.streamToSubscriptions.Load(streamID)
				if !ok {
					fmt.Println("syncIDs not found in streamToSubscriptions")
					log.Errorw("Received update for the stream with no subscribers", "streamID", streamID)
					continue
				}

				// Order is important here, we need to send the message to all subscribers
				for syncID := range syncIDs {
					toSend[syncID] = append(toSend[syncID], proto.Clone(msg).(*SyncStreamsResponse))
				}
			}

			// Iterate over all sync IDs and send the message to the corresponding subscription
			var wg sync.WaitGroup
			for syncID, msgs := range toSend {
				wg.Add(1)
				go func(syncID string, msgs []*SyncStreamsResponse) {
					defer wg.Done()

					// Get subscription by the given sync ID
					sub, ok := ss.subscriptions.Load(syncID)
					if !ok {
						log.Errorw("Sync does not have subscription", "syncID", syncID)
						return
					}

					// Send messages to the given subscriber
					for _, msg := range msgs {
						msg.SyncId = sub.syncID

						// Send message to the subscriber
						select {
						case <-sub.ctx.Done():
							fmt.Println("sub.ctx closed")
							sub.messages.Close()
							// TODO: Log sub.ctx.Err()
						default:
							if err := sub.messages.AddMessage(msg); err != nil {
								// TODO: Log error
								sub.cancel(err)
							}
						}
					}
				}(syncID, msgs)
			}
			wg.Wait()

			/*select {
			case <-ss.ctx.Done():
				err := context.Cause(ss.ctx)
				if err != nil {
					log.Errorw("Sync operation stopped", "error", err)
				} else {
					log.Debug("Sync operation stopped")
				}
				ss.subscriptions.Range(func(_ string, sub *Subscription) bool {
					sub.messages.Close()
					sub.cancel(err)
					return true
				})
				ss.subscriptions.Clear()
				return
			default:
			}*/

			// If the client sent a close message, stop sending messages to client from the buffer.
			// In theory should not happen, but just in case.
			if !open {
				ss.subscriptions.Range(func(_ string, sub *Subscription) bool {
					sub.messages.Close()
					sub.cancel(nil)
					return true
				})
				ss.subscriptions.Clear()
				return
			}
		}
	}
}
