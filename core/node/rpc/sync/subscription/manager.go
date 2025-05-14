package subscription

import (
	"context"
	"slices"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type Manager struct {
	// log is the logger for this stream sync operation
	log *logging.Log

	globalCtx context.Context

	syncers  *client.SyncerSet
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]

	subscriptions         xsync.Map[string, *Subscription]
	streamToSubscriptions xsync.Map[StreamId, []string]
}

func NewManager(
	ctx context.Context,
	localNodeAddr common.Address,
	streamCache *StreamCache,
	nodeRegistry nodes.NodeRegistry,
	otelTracer trace.Tracer,
) *Manager {
	globalCtx, cancel := context.WithCancelCause(ctx)
	log := logging.FromCtx(globalCtx).With("node", localNodeAddr)

	syncers, messages := client.NewSyncers(
		globalCtx, cancel, streamCache,
		nodeRegistry, localNodeAddr, otelTracer)

	go syncers.Run()

	manager := &Manager{
		log:       log,
		globalCtx: globalCtx,
		syncers:   syncers,
		messages:  messages,
	}

	go manager.start()

	return manager
}

func (m *Manager) start() {
	var msgs []*SyncStreamsResponse
	for {
		select {
		case <-m.globalCtx.Done():
			// TODO: Handle
			return
		case _, open := <-m.messages.Wait():
			msgs = m.messages.GetBatch(msgs)

			// nil msgs indicates the buffer is closed
			if msgs == nil {
				// TODO: Handle
				return
			}

			for _, msg := range msgs {
				if msg.GetSyncOp() == SyncOp_SYNC_UPDATE || msg.GetSyncOp() == SyncOp_SYNC_DOWN {
					streamID := StreamId(msg.GetStreamId())

					// Send the message to all subscriptions for this stream
					subscriptions, _ := m.streamToSubscriptions.Load(streamID)
					for _, subscriptionID := range subscriptions {
						subscription, ok := m.subscriptions.Load(subscriptionID)
						if !ok {
							// TODO: Handle
							continue
						}

						if err := subscription.Messages.AddMessage(msg); err != nil {
							// TODO: Handle error
						}
					}
				} else if msg.GetSyncOp() == SyncOp_SYNC_CLOSE {
					return
				} else {
					// TODO: Handle, unexpected op type
				}

				select {
				case <-m.globalCtx.Done():
					// TODO: Handle
					return
				default:
				}
			}

			// If the client sent a close message, stop sending messages to client from the buffer.
			// In theory should not happen, but just in case.
			if !open {
				// TODO: Handle
				return
			}
		}
	}
}

func (m *Manager) Subscribe(ctx context.Context, cancel context.CancelCauseFunc, syncOp string) *Subscription {
	suscription := &Subscription{
		Ctx:      ctx,
		Cancel:   cancel,
		SyncOp:   syncOp,
		Messages: dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
	}
	m.subscriptions.Store(syncOp, suscription)
	return suscription
}

type Subscription struct {
	Ctx      context.Context
	Cancel   context.CancelCauseFunc
	SyncOp   string
	Messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]

	manager *Manager
}

func (s *Subscription) Modify(ctx context.Context, req client.ModifyRequest) error {
	// Validate the given request first
	if err := req.Validate(); err != nil {
		return err
	}

	// Prepare a request to be sent to the syncer set if needed
	modifiedReq := client.ModifyRequest{
		AddingFailureHandler:   req.AddingFailureHandler,
		RemovingFailureHandler: req.RemovingFailureHandler,
	}

	// Handle streams that the clients wants to subscribe to.
	for _, toAdd := range req.ToAdd {
		var existed bool
		var subscribed bool

		// Add the stream to the subscription
		s.manager.streamToSubscriptions.Compute(
			StreamId(toAdd.GetStreamId()),
			func(oldValue []string, loaded bool) (newValue []string, op xsync.ComputeOp) {
				existed = loaded

				if subscribed = slices.Contains(oldValue, s.SyncOp); subscribed {
					// The given stream is already subscribed
					return nil, xsync.CancelOp
				}

				return append(oldValue, s.SyncOp), xsync.UpdateOp
			},
		)

		if subscribed {
			// The given subscription already subscribed on the given stream, no nothing
			continue
		} else if !existed {
			// The given stream is not subscribed yet, add it to the syncer set.
			// It is ok to use the entire cookie when subscribing at the first time.
			modifiedReq.ToAdd = append(modifiedReq.ToAdd, toAdd)
		} else {
			// The subscription on the given stream already in but the client might
			// want to get updates since a specific miniblock.
			// TODO: Load updates based on the sync cookie
		}
	}

	// Handle streams that the clients wants to unsubscribe from.
	for _, toRemove := range req.ToRemove {
		var found bool

		// Remove the stream from the subscription
		s.manager.streamToSubscriptions.Compute(
			StreamId(toRemove),
			func(oldValue []string, loaded bool) (newValue []string, op xsync.ComputeOp) {
				if !loaded {
					// No record found for the given stream, just cancel
					return nil, xsync.CancelOp
				}

				if len(oldValue) == 0 {
					// No subscriptions for the given stream, just delete the record from cache
					return nil, xsync.DeleteOp
				}

				// Remove the given subscriptions from the list of subscribers on the given stream
				for i, sub := range oldValue {
					if sub == s.SyncOp {
						found = true
						newValue = append(oldValue[:i], oldValue[i+1:]...)
					}
				}

				if len(newValue) == len(oldValue) {
					// The given subscriber is not subscribed on the given stream
					return nil, xsync.CancelOp
				}

				if len(newValue) == 0 {
					// No more subscriptions for the given stream, remove it from the entire sync
					modifiedReq.ToRemove = append(modifiedReq.ToRemove, toRemove)
					return nil, xsync.DeleteOp
				}

				return newValue, xsync.UpdateOp
			},
		)

		if !found {
			req.RemovingFailureHandler(&SyncStreamOpStatus{
				StreamId: toRemove,
				Code:     int32(Err_NOT_FOUND),
				Message:  "Stream not part of sync operation",
			})
		}
	}

	if len(modifiedReq.ToAdd) == 0 && len(modifiedReq.ToRemove) == 0 {
		// No changes to be made, just return
		return nil
	}

	// Send the request to the syncer set
	if err := s.manager.syncers.Modify(ctx, modifiedReq); err != nil {
		return err
	}

	// TODO: Handle remove and add failures

	return nil
}

func (s *Subscription) DebugDropStream(ctx context.Context, streamID StreamId) error {
	// TODO: Drop stream only for the current subscription. Drop from syncers if no more subscribers left.
	return s.manager.syncers.DebugDropStream(ctx, streamID)
}
