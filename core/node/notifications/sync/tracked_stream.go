package sync

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

type (
	UserPreferencesStore interface {
		// BlockUser blocks the given blockedUser for the given user
		BlockUser(
			user common.Address,
			blockedUser common.Address,
		)

		// UnblockUser unblocks the given blockedUser for the given user
		UnblockUser(
			user common.Address,
			blockedUser common.Address,
		)
	}
)

// NewTrackedStreamForNotifications constructs a lightweight TrackedStreamView instance optimized
// for notifications. Unlike the full TrackedStreamViewImpl which stores blocks/minipool/snapshot,
// this NotificationStreamView stores only member addresses.
//
// MEASURED MEMORY (NEW - NotificationStreamView):
//   - 100 members:  ~36 KB per stream  (For 1M streams: ~34 GB)
//   - 1000 members: ~340 KB per stream (For 1M streams: ~324 GB)
//
// ESTIMATED MEMORY (OLD - TrackedStreamViewImpl with full StreamView):
//
//	The old implementation stored complete StreamView objects with blocks, minipool, and snapshots.
//	Based on StreamView structure, estimated at ~250-500 KB base overhead + member data per stream,
//	significantly higher than the new implementation especially for streams with long history.
//
// This ensures user blocked lists are kept up-to-date and message events are sent to the listener.
//
// See notification_stream_view_bench_test.go for benchmarks.
func NewTrackedStreamForNotifications(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	listener track_streams.StreamEventListener,
	userPreferences UserPreferencesStore,
) (TrackedStreamView, error) {
	// Use the memory-optimized notification stream view
	return NewNotificationStreamView(
		ctx,
		streamID,
		cfg,
		stream,
		listener,
		userPreferences,
	)
}
