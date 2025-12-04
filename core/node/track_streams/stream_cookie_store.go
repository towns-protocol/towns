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
	// GetSyncCookie retrieves a stored cookie and snapshot miniblock for a stream.
	// Returns (nil, 0, zero time, nil) if no cookie exists.
	// snapshotMiniblock is the miniblock number where the last snapshot was created (for gap detection).
	GetSyncCookie(
		ctx context.Context,
		streamID shared.StreamId,
	) (cookie *protocol.SyncCookie, snapshotMiniblock int64, updatedAt time.Time, err error)

	// PersistSyncCookie stores a cookie after processing events.
	// snapshotMiniblock should be updated when a new snapshot is received, otherwise pass the previous value.
	PersistSyncCookie(
		ctx context.Context,
		streamID shared.StreamId,
		cookie *protocol.SyncCookie,
		snapshotMiniblock int64,
	) error
}
