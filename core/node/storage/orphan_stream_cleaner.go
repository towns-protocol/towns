package storage

import (
	"context"
	"time"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// CleanupOrphanedStreams identifies and deletes streams that exist in the database
// but are not in the provided registry results. The nodesRegistriesStreams parameter
// must hold all stream records retrieved from the stream registry. The node
// must process any placement updates that are emitted after nodesRegistriesStreams
// is collected and this function returns.
func CleanupOrphanedStreams(
	ctx context.Context,
	store *PostgresStreamStore,
	nodesRegistriesStreams []*river.StreamWithId,
) {
	start := time.Now()
	log := logging.FromCtx(ctx)

	// Get all streams from the database
	dbStreams, err := store.GetStreams(ctx)
	if err != nil {
		log.Warnw("Failed to get streams from database for orphan cleanup", "error", err)
		return
	}

	// Build a set of registry stream IDs
	registryStreamSet := make(map[StreamId]struct{}, len(nodesRegistriesStreams))
	for _, stream := range nodesRegistriesStreams {
		registryStreamSet[stream.StreamId()] = struct{}{}
	}

	// Find streams in DB but not in the registry
	var deleted, failed int
	for _, dbStreamId := range dbStreams {
		if _, exists := registryStreamSet[dbStreamId]; !exists {
			if err := store.DeleteStream(ctx, dbStreamId); err != nil {
				if ctx.Err() != nil {
					return
				}
				log.Warnw("Failed to delete orphaned stream",
					"streamId", dbStreamId,
					"error", err,
				)
				failed++
			} else {
				log.Debugw("Deleted orphaned stream", "streamId", dbStreamId)
				deleted++
			}
		}
	}

	if deleted > 0 || failed > 0 {
		log.Infow("Orphan stream cleanup complete",
			"deleted", deleted,
			"failed", failed,
			"dbStreamCount", len(dbStreams),
			"registryStreamCount", len(nodesRegistriesStreams),
			"took", time.Since(start).String(),
		)
	}
}
