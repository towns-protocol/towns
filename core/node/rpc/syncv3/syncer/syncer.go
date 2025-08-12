package syncer

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// List of possible states of the stream update emitter.
const (
	streamUpdateEmitterStateInitializing int32 = iota
	streamUpdateEmitterStateRunning
	streamUpdateEmitterStateClosed
)

var (
	_ Registry = (*registryImpl)(nil)
)

type (
	// backfillRequest is used by syncers as an element in the backfill queue.
	backfillRequest struct {
		cookie  *SyncCookie
		syncIDs []string
	}

	// StreamCache represents a behavior of the stream cache.
	StreamCache interface {
		GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (*events.Stream, error)
		GetStreamNoWait(ctx context.Context, streamId StreamId) (*events.Stream, error)
	}

	// StreamSubscriber accept (local or remote) stream events.
	StreamSubscriber interface {
		// OnStreamEvent is called by StreamUpdateEmitter for each stream event.
		//
		// Subscribers MUST NOT block when processing the given update.
		//
		// When update.SyncOp is SyncOp_SYNC_DOWN this is the last update the subscriber
		// receives for the stream. It is expected that this update is sent to the client
		// and that the client will resubscribe.
		//
		// Version indicates which version of the syncer the update is sent from. If node A goes down
		// and node B takes over the sync operation, the version will be incremented.
		OnStreamEvent(update *SyncStreamsResponse, version int32)
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

		// Backfill backfills the given stream by the given cookie.
		// syncIDs is the chain of sync IDs that the backfill request should be sent to.
		//
		// Returns false if the given emitter is closed.
		Backfill(cookie *SyncCookie, syncIDs []string) bool
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
		// Note: the event bus is the only subscriber for the stream.
		Unsubscribe(streamID StreamId, subscriber StreamSubscriber)

		// Backfill sends a request to appropriate syncer to backfill a specific sync operation by the given
		// chain of sync identifiers.
		Backfill(cookie *SyncCookie, syncIDs []string) error
	}
)
