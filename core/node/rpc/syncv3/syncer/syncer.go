package syncer

import (
	"sync"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
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
		Subscribe(subscriber StreamSubscriber) error

		// Unsubscribe from updates of the stream.
		//
		// If no subscribers left, the emitter should be closed.
		// Returns true if the emitter was closed, false otherwise.
		Unsubscribe(subscriber StreamSubscriber) bool

		// Backfill backfills the given stream by the given cookie.
		// syncIDs is the chain of sync IDs that the backfill request should be sent to.
		Backfill(cookie *SyncCookie, syncIDs []string) error
	}

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

		// Backfill sends a request to appropriate syncer to backfill a specific sync operation by the given
		// chain of sync identifiers.
		// TODO: If a syncer for the given stream ID is not found, it returns an error or the sync down message.
		Backfill(cookie *SyncCookie, syncIDs []string) error
	}

	registryImpl struct {
		syncersLock sync.Mutex
		syncers     map[StreamId]StreamUpdateEmitter
	}
)
