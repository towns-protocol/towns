package subscription

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/trace"

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
	log           *logging.Log
	localNodeAddr common.Address
	globalCtx     context.Context

	streamCache  *StreamCache
	nodeRegistry nodes.NodeRegistry

	syncers  *client.SyncerSet
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]

	sLock         sync.Mutex
	subscriptions map[StreamId][]*Subscription

	otelTracer trace.Tracer
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
		log:           log,
		localNodeAddr: localNodeAddr,
		globalCtx:     globalCtx,
		streamCache:   streamCache,
		nodeRegistry:  nodeRegistry,
		otelTracer:    otelTracer,
		syncers:       syncers,
		messages:      messages,
		subscriptions: make(map[StreamId][]*Subscription),
	}

	go manager.start()

	return manager
}

func (m *Manager) Subscribe(ctx context.Context, cancel context.CancelCauseFunc, syncID string) *Subscription {
	return &Subscription{
		log:      m.log.With("syncId", syncID),
		ctx:      ctx,
		cancel:   cancel,
		syncID:   syncID,
		Messages: dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		manager:  m,
	}
}

func (m *Manager) start() {
	defer m.cancelAllSubscriptions(m.globalCtx.Err())

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
				m.distributeMessage(msg)

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

// distributeMessage processes the given message and sends it to all relevant subscriptions.
func (m *Manager) distributeMessage(msg *SyncStreamsResponse) {
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

	// Send the message to all subscriptions for this stream.
	m.sLock.Lock()
	subscriptions, ok := m.subscriptions[streamID]
	if !ok {
		// No subscriptions for this stream, nothing to do.
		// TODO: When this case might happen?
		// TODO: Remove the given stream from the syncer set to no longer receive updates for the given stream.
		m.sLock.Unlock()
		return
	}

	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		// The given stream is no longer needed, remove it from the subscriptions.
		delete(m.subscriptions, streamID)
	}
	m.sLock.Unlock()

	// FIXME: Potentially, a single subscription might block the entire sending process.
	var wg sync.WaitGroup
	wg.Add(len(subscriptions))
	for i, subscription := range subscriptions {
		go func(i int, subscription *Subscription) {
			if subscription.isClosed() && msg.GetSyncOp() != SyncOp_SYNC_DOWN {
				// Remove the given subscriptions from the list of subscriptions of the given stream
				m.sLock.Lock()
				m.subscriptions[streamID] = append(subscriptions[:i], subscriptions[i+1:]...)
				m.sLock.Unlock()
			} else {
				subscription.Send(msg)
			}
			wg.Done()
		}(i, subscription)
	}
	wg.Wait()
}

func (m *Manager) cancelAllSubscriptions(err error) {
	m.sLock.Lock()
	for _, subscriptions := range m.subscriptions {
		for _, sub := range subscriptions {
			if !sub.isClosed() {
				sub.cancel(err)
			}
		}
	}
	m.subscriptions = make(map[StreamId][]*Subscription)
	m.sLock.Unlock()
}
