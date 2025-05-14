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

	subscriptions         *xsync.Map[string, *Subscription]
	streamToSubscriptions *xsync.Map[StreamId, []string]
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
		log:                   log,
		globalCtx:             globalCtx,
		syncers:               syncers,
		messages:              messages,
		subscriptions:         xsync.NewMap[string, *Subscription](),
		streamToSubscriptions: xsync.NewMap[StreamId, []string](),
	}

	go manager.start()

	return manager
}

func (m *Manager) Subscribe(cancel context.CancelCauseFunc, syncOp string) *Subscription {
	subscription := &Subscription{
		log:      m.log.With("syncId", syncOp),
		Cancel:   cancel,
		SyncOp:   syncOp,
		Messages: dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		manager:  m,
	}
	m.subscriptions.Store(syncOp, subscription)
	return subscription
}

func (m *Manager) start() {
	var msgs []*SyncStreamsResponse
	for {
		select {
		case <-m.globalCtx.Done():
			// TODO: Handle, cancel all subscriptions
			return
		case _, open := <-m.messages.Wait():
			msgs = m.messages.GetBatch(msgs)

			// nil msgs indicates the buffer is closed
			if msgs == nil {
				// TODO: Handle, should not happen
				return
			}

			for _, msg := range msgs {
				// Distribute the messages to all relevant subscriptions.
				m.distributeMessages(msg)

				// In case of the global context (the node itself) is done in the middle of the sending messages
				// from the current batch, just interrupt the sending process and close.
				select {
				case <-m.globalCtx.Done():
					// TODO: Handle, cancel all subscriptions
					return
				default:
				}
			}

			// If the client sent a close message, stop sending messages to client from the buffer.
			// In theory should not happen, but just in case.
			if !open {
				// TODO: Handle, cancel all subscriptions
				return
			}
		}
	}
}

// distributeMessages processes the given message and sends it to all relevant subscriptions.
func (m *Manager) distributeMessages(msg *SyncStreamsResponse) {
	// Ignore messages that are not SYNC_UPDATE or SYNC_DOWN
	if msg.GetSyncOp() != SyncOp_SYNC_UPDATE && msg.GetSyncOp() != SyncOp_SYNC_DOWN {
		m.log.Errorw("Received unexpected sync stream message", "op", msg.GetSyncOp())
		return
	}

	var streamIDRaw []byte
	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		streamIDRaw = msg.GetStreamId()
	} else {
		streamIDRaw = msg.GetStream().GetNextSyncCookie().GetStreamId()
	}

	streamID, err := StreamIdFromBytes(streamIDRaw)
	if err != nil || streamID == (StreamId{}) {
		m.log.Errorw("Failed to get stream ID from the message", "op", streamID, "err", err)
		return
	}

	// Send the message to all subscriptions for this stream
	// TODO: Parallelize this?
	subscriptions, _ := m.streamToSubscriptions.Load(streamID)
	for i, syncID := range subscriptions {
		subscription, ok := m.subscriptions.Load(syncID)
		if !ok {
			// The given subscription has already been removed, just delete from list and update.
			m.streamToSubscriptions.Store(streamID, slices.Delete(subscriptions, i, i+1))
			continue
		}

		// Send message to subscriber
		if err := subscription.Messages.AddMessage(msg); err != nil {
			rvrErr := AsRiverError(err).
				Tag("syncId", subscription.SyncOp).
				Tag("op", msg.GetSyncOp())
			subscription.Cancel(rvrErr)
			m.log.Errorw("Failed to add message to subscription",
				"syncId", subscription.SyncOp, "op", msg.GetSyncOp(), "err", err)
			continue
		}

		if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
			// The given stream is no longer needed, remove it from the subscription
			subscription.removeStream(streamIDRaw)
		}
	}
}
