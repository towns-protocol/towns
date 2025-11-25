package track_streams

import (
	"context"

	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// StreamCookieStore handles cookie persistence for stream resumption.
// This is the generic storage interface - same implementation can be used by all services.
type StreamCookieStore interface {
	// GetStreamCookie retrieves a stored cookie for a stream (called when starting sync).
	// Returns nil, nil if no cookie exists.
	GetStreamCookie(ctx context.Context, streamID shared.StreamId) (*protocol.SyncCookie, error)

	// PersistSyncCookie stores a cookie after processing events.
	PersistSyncCookie(ctx context.Context, streamID shared.StreamId, cookie *protocol.SyncCookie) error
}
