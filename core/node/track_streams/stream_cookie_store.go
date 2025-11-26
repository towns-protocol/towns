package track_streams

import (
	"context"
	"time"

	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// SyncCookieStore handles cookie persistence for stream resumption.
// This is the generic storage interface - same implementation can be used by all services.
type SyncCookieStore interface {
	// GetStreamCookie retrieves a stored cookie for a stream (called when starting sync).
	// Returns (nil, zero time, nil) if no cookie exists.
	GetSyncCookie(ctx context.Context, streamID shared.StreamId) (*protocol.SyncCookie, time.Time, error)

	// PersistSyncCookie stores a cookie after processing events.
	PersistSyncCookie(ctx context.Context, streamID shared.StreamId, cookie *protocol.SyncCookie) error
}
