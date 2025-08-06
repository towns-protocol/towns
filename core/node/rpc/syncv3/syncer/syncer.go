package syncer

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

var (
	_ Registry = (*registryImpl)(nil)
)

type (
	// StreamCache represents a behavior of the stream cache.
	StreamCache interface {
		GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (*events.Stream, error)
		GetStreamNoWait(ctx context.Context, streamId StreamId) (*events.Stream, error)
	}

	// StreamSubscriber accept (local or remote) stream events.
	StreamSubscriber interface {
		// OnStreamEvent is called for each stream event.
		//
		// Subscribers MUST NOT block when processing the given update.
		//
		// When update.SyncOp is SyncOp_SYNC_DOWN this is the last update the subscriber
		// receives for the stream. It is expected that this update is sent to the client
		// and that the client will resubscribe.
		OnStreamEvent(update *SyncStreamsResponse)
	}

	// StreamUpdateEmitter emit events related to a specific stream.
	//
	// There are two types of emitters:
	// 1. Local emitters that emit events for local streams.
	// 2. Remote emitters that emit events for remote streams.
	StreamUpdateEmitter interface {
		// StreamID returns the StreamID of the stream that this emitter emits events for.
		StreamID() StreamId

		// Node returns the address of the node that the emitter subscribes to for stream updates.
		// For local streams this is the local node address.
		// For remote streams this is the address of the remote node.
		Node() common.Address

		// Subscribe for updates on the stream.
		Subscribe(subscriber StreamSubscriber)

		// Unsubscribe from updates of the stream.
		//
		// If no subscribers left, the emitter should be closed.
		// Returns true if the emitter was closed, false otherwise.
		Unsubscribe(subscriber StreamSubscriber)

		// Backfill backfills the given stream by the given cookie.
		// targetSyncID is the ID of the sync operation that should receive the requested backfill message.
		Backfill(cookie *SyncCookie, targetSyncID string) error
	}

	// Registry is a registry of stream update emitters (syncers).
	Registry interface {
		// Subscribe subscribes to the given stream updates.
		//
		// If the given stream ID is not found, it sends the stream down message to the subscriber
		// with the reason (message field in proto).
		Subscribe(streamID StreamId, subscriber StreamSubscriber)

		// Unsubscribe unsubscribes from the given stream updates.
		//
		// If StreamSubscriber has received the stream down message, it should call the given Unsubscribe function.
		// If no more subscribers are left for the stream, the emitter should be closed.
		//
		// Note: initially, the event bus is the only subscriber for the stream.
		Unsubscribe(streamID StreamId, subscriber StreamSubscriber)

		// Backfill sends a request to appropriate syncer to backfill a specific sync operation by the given cookie.
		//
		// Note: it returns error instead of sending a sync down message.
		Backfill(cookie *SyncCookie, targetSyncID string) error
	}
)
