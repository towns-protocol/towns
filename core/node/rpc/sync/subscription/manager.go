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

func (m *Manager) Subscribe(ctx context.Context, cancel context.CancelCauseFunc, syncOp string) *Subscription {
	subcription := &Subscription{
		log:      m.log.With("syncId", syncOp),
		Ctx:      ctx,
		Cancel:   cancel,
		SyncOp:   syncOp,
		Messages: dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
	}
	go subcription.Run()
	m.subscriptions.Store(syncOp, subcription)
	return subcription
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
				// TODO: Handle
				return
			}

			for _, msg := range msgs {
				m.distributeMessages(msg)

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

// distributeMessages ...
func (m *Manager) distributeMessages(msg *SyncStreamsResponse) {
	// Ignore messages that are not SYNC_UPDATE or SYNC_DOWN
	if msg.GetSyncOp() != SyncOp_SYNC_UPDATE && msg.GetSyncOp() != SyncOp_SYNC_DOWN {
		m.log.Errorw("Received unexpected sync stream message", "op", msg.GetSyncOp())
		return
	}

	streamID, err := StreamIdFromBytes(msg.GetStreamId())
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
		}
	}
}
