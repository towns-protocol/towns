package syncer

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// backfillRequest is used by syncers as an element in the backfill queue.
type backfillRequest struct {
	cookie  *SyncCookie
	syncIDs []string
}

// StreamCache represents a behavior of the stream cache.
type StreamCache interface {
	GetStreamNoWait(ctx context.Context, streamID StreamId) (*events.Stream, error)
}

// StreamSubscriber accept (local or remote) stream events.
type StreamSubscriber interface {
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
	OnStreamEvent(update *SyncStreamsResponse, version int)
}

// StreamUpdateEmitter emit events related to a specific stream.
//
// There are two types of emitters:
// 1. Local emitters that emit events for local streams.
// 2. Remote emitters that emit events for remote streams.
type StreamUpdateEmitter interface {
	// StreamID returns the StreamID of the stream that this emitter emits events for.
	StreamID() StreamId

	// Node returns the address of the node that the emitter subscribes to for stream updates.
	// For local streams this is the local node address.
	// For remote streams this is the address of the remote node.
	Node() common.Address

	// Version returns the version of the emitter.
	//
	// This is used to properly address sync down messages when a specific remote node goes down so a new
	// version of the emitter is created. For example, if node A goes down, only subscriptions that receive stream
	// updates the given emitter will receive the sync down message with the version of the emitter. Subscriptions
	// from the next version must not receive the sync down message.
	Version() int

	// EnqueueBackfill adds the given backfill operation to the queue for further processing.
	// syncIDs is the chain of sync IDs that the backfill request should be sent to.
	//
	// Returns false if the given emitter is closed.
	EnqueueBackfill(cookie *SyncCookie, syncIDs []string) bool

	// Close the emitter.
	// This method should be called by the registry to stop receiving updates for the stream.
	Close()
}

// Registry is a registry of stream update emitters (syncers).
type Registry interface {
	// EnqueueSubscribeAndBackfill adds a message to the queue to subscribe to the given stream updates and
	// send a backfill message to the target sync operation by the given sync IDs.
	//
	// If the given stream ID is not found, it sends the stream down message to the subscriber
	// with the reason (message field in proto).
	EnqueueSubscribeAndBackfill(cookie *SyncCookie, syncIDs []string)

	// EnqueueUnsubscribe adds a message to the queue to unsubscribe from the given stream updates.
	// The registry stops and removes the emitter for the given stream ID. Should be called to stop receiving updates
	// for the stream and to clean up resources.
	//
	// Note: the event bus is the only subscriber for the stream.
	EnqueueUnsubscribe(streamID StreamId)
}
