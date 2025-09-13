package syncer

import (
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"

	"github.com/ethereum/go-ethereum/common"
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
		StreamID() shared.StreamId

		// Node returns the address of the node that the emitter subscribes to for stream updates.
		// For local streams this is the local node address.
		// For remote streams this is the address of the remote node.
		Node() common.Address

		// Subscribe for updates on the stream
		Subscribe(subscriber StreamSubscriber)
	}
)
