package client

import (
	"context"
	"sync"

	"github.com/puzpuzpuz/xsync/v4"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type messageRouter struct {
	log                 *logging.Log
	subscriptions       *xsync.Map[string, *subscription]
	streamSubscriptions *xsync.Map[StreamId, *xsync.Map[string, struct{}]]
	mu                  sync.Mutex // for shutdown
	shutdown            bool
}

func newMessageRouter(ctx context.Context) *messageRouter {
	return &messageRouter{
		log:                 logging.FromCtx(ctx).Named("message_router"),
		subscriptions:       xsync.NewMap[string, *subscription](),
		streamSubscriptions: xsync.NewMap[StreamId, *xsync.Map[string, struct{}]](),
	}
}

func (r *messageRouter) registerSubscription(syncID string, sub *subscription) {
	r.subscriptions.Store(syncID, sub)
}

func (r *messageRouter) unregisterSubscription(syncID string) {
	r.subscriptions.Delete(syncID)
	r.streamSubscriptions.Range(func(streamID StreamId, syncIDs *xsync.Map[string, struct{}]) bool {
		syncIDs.Delete(syncID)
		if syncIDs.Size() == 0 {
			r.streamSubscriptions.Delete(streamID)
		}
		return true
	})
}

func (r *messageRouter) addStreamToSubscription(syncID string, streamID StreamId) {
	syncIDs, _ := r.streamSubscriptions.LoadOrStore(streamID, xsync.NewMap[string, struct{}]())
	syncIDs.Store(syncID, struct{}{})
	r.streamSubscriptions.Store(streamID, syncIDs)
}

func (r *messageRouter) removeStreamFromSubscription(syncID string, streamID StreamId) {
	if syncIDs, ok := r.streamSubscriptions.Load(streamID); ok {
		syncIDs.Delete(syncID)
		if syncIDs.Size() == 0 {
			r.streamSubscriptions.Delete(streamID)
		} else {
			r.streamSubscriptions.Store(streamID, syncIDs)
		}
	}
}

func (r *messageRouter) removeStreamAndCheckLast(syncID string, streamID StreamId) (last bool, notFound bool) {
	subscribers, ok := r.streamSubscriptions.Load(streamID)
	if !ok {
		return false, true
	}

	if _, ok = subscribers.Load(syncID); !ok {
		return false, true
	}

	subscribers.Delete(syncID)

	return subscribers.Size() == 0, false
}

func (r *messageRouter) isSubscribed(syncID string, streamID StreamId) bool {
	if subscribers, ok := r.streamSubscriptions.Load(streamID); ok {
		_, ok = subscribers.Load(syncID)
		return ok
	}
	return false
}

func (r *messageRouter) getSubscription(syncID string) *subscription {
	if sub, ok := r.subscriptions.Load(syncID); ok {
		return sub
	}
	return nil
}

func (r *messageRouter) routeMessages(msgs []*SyncStreamsResponse) {
	// Create a map of sync ID to messages. This is used to send the messages to the corresponding
	// subscription (clients) in parallel.
	toSend := make(map[string][]*SyncStreamsResponse)
	for _, msg := range msgs {
		streamID := StreamId(msg.GetStreamId())

		// Get all subscriptions for the given stream.
		syncIDs, ok := r.streamSubscriptions.Load(streamID)
		if !ok {
			r.log.Errorw("Received update for the stream with no subscribers", "streamID", streamID)
			continue
		}

		// Order is important here, we need to send the message to all subscribers
		syncIDs.Range(func(syncID string, _ struct{}) bool {
			toSend[syncID] = append(toSend[syncID], proto.Clone(msg).(*SyncStreamsResponse))
			return true
		})
	}

	// Send messages to all subscribers in parallel.
	var wg sync.WaitGroup
	wg.Add(len(toSend))
	for syncID, msgs := range toSend {
		go func(syncID string, msgs []*SyncStreamsResponse) {
			defer wg.Done()
			// Get subscription by the given sync ID
			sub, ok := r.subscriptions.Load(syncID)
			if !ok {
				r.log.Errorw("Sync ID provided by no subscription found", "syncID", syncID)
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
						r.log.Errorw("Client closed the connection", "syncID", syncID, "error", sub.ctx.Err())
					} else {
						r.log.Info("Client closed the connection")
					}
					sub.messages.Close()
					r.unregisterSubscription(syncID)
					return
				default:
					if err := sub.messages.AddMessage(msg); err != nil {
						r.log.Errorw("Failed to add message to subscription", "syncID", syncID, "error", err)
						sub.messages.Close()
						sub.Close(err)
						r.unregisterSubscription(syncID)
						return
					}
				}
			}
		}(syncID, msgs)
	}
	wg.Wait()
}

func (r *messageRouter) close(err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.shutdown {
		return
	}

	r.shutdown = true
	r.subscriptions.Range(func(_ string, sub *subscription) bool {
		sub.Close(err)
		return true
	})
	r.subscriptions.Clear()
	r.streamSubscriptions.Clear()
}
