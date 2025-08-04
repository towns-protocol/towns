package syncer

import (
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
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
		syncers map[StreamId]StreamUpdateEmitter
	}
)
