package storage

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/puzpuzpuz/xsync/v4"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	// MigrateToExternalStorageMaxRetries is the number of times to retry migrating
	// a streams miniblocks to external storage per boot.
	MigrateToExternalStorageMaxRetries = 5
)

// ephemeralStreamMonitor is a monitor that keeps track of ephemeral streams and cleans up dead ones.
type ephemeralStreamMonitor struct {
	// streams is a map of ephemeral stream IDs to the creation time.
	// This is used by the monitor to detect "dead" ephemeral streams and delete them.
	streams *xsync.Map[StreamId, time.Time]
	// streamsToMigrateToExternalStorage keeps a collection of ephemeral streams that
	// need their miniblocks to be migrated to external storage together with a retry
	// counter. The retry counter is used to retry migrations up to
	// MigrateToExternalStorageMaxRetries times in case of an error before giving up.
	streamsToMigrateToExternalStorage *xsync.Map[StreamId, int]
	// migrateExistingMediaStreamsToExternalStorage if true, migrates existing media
	// stream miniblock data to external storage. If false only new media streams are
	// uploaded to external storage.
	migrateExistingMediaStreamsToExternalStorage bool
	// ttl is the duration of time an ephemeral stream can exist
	// before either being sealed/normalized or deleted.
	ttl      time.Duration
	storage  *PostgresStreamStore
	stopOnce sync.Once
	stop     chan struct{}
}

// newEphemeralStreamMonitor creates and starts an ephemeral stream monitor.
// It purges ephemeral streams that have not been sealed/normalized for the given TTL
// and migrates miniblocks of just normalized ephemeral streams to external storage if
// configured. If migrateMediaStreamsToExternalStorage is true is also migrates miniblock
// data of existing media streams from database to external storage.
func newEphemeralStreamMonitor(
	ctx context.Context,
	ttl time.Duration,
	storage *PostgresStreamStore,
	migrateExistingMediaStreamsToExternalStorage bool,
) (*ephemeralStreamMonitor, error) {
	if ttl == 0 {
		ttl = time.Minute * 10
	}

	m := &ephemeralStreamMonitor{
		streams:                           xsync.NewMap[StreamId, time.Time](),
		streamsToMigrateToExternalStorage: xsync.NewMap[StreamId, int](),
		storage:                           storage,
		ttl:                               ttl,
		stop:                              make(chan struct{}),
		migrateExistingMediaStreamsToExternalStorage: migrateExistingMediaStreamsToExternalStorage,
	}

	// Load all ephemeral streams from the database.
	if err := m.loadEphemeralStreams(ctx); err != nil {
		return nil, err
	}

	// Start the dead stream monitor.
	go m.monitor(ctx)

	// if external storage is configured, migrate miniblock data from DB to external storage.
	if m.storage.ExternalStorageEnabled() {
		go m.runStreamMigrationToExternalStorage(ctx)
	}

	return m, nil
}

// close closes the monitor.
func (m *ephemeralStreamMonitor) close() {
	m.stopOnce.Do(func() {
		close(m.stop)
	})
}

// onCreated is called when an ephemeral stream is created.
func (m *ephemeralStreamMonitor) onCreated(streamId StreamId) {
	m.streams.Store(streamId, time.Now())
}

// onSealed is called when an ephemeral stream gets sealed.
func (m *ephemeralStreamMonitor) onSealed(streamId StreamId) {
	m.streams.Delete(streamId)
	if m.storage.ExternalStorageEnabled() && streamId.Type() == STREAM_MEDIA_BIN {
		// if external store is enabled queue task to migrate media stream
		// miniblock data to external storage
		_, _ = m.streamsToMigrateToExternalStorage.LoadOrStore(streamId, 0)
	}
}

// runMigrateExistingMediaStreamsToExternalStorage schedules a task to migrate miniblocks of
// existing media streams to external storage.
func (m *ephemeralStreamMonitor) runMigrateExistingMediaStreamsToExternalStorage(ctx context.Context) {
	if !m.migrateExistingMediaStreamsToExternalStorage {
		return
	}

	select {
	case <-m.stop:
		return
	case <-time.After(10 * time.Second):
		break
	}

	log := logging.FromCtx(ctx)

	migratedAllExistingStreams := false
	for !migratedAllExistingStreams {
		const limit = 2500
		if streamsToMigrate, err := m.storage.LoadMediaStreamsWithMiniblocksReadyToMigrate(ctx, limit); err == nil {
			// schedule streams for migration
			for _, stream := range streamsToMigrate {
				_, _ = m.streamsToMigrateToExternalStorage.LoadOrStore(stream, 0)
			}
			// if there are no streams left stop.
			// new streams are scheduled for migration through the monitor.onSealed func.
			migratedAllExistingStreams = len(streamsToMigrate) < limit
		} else {
			log.Error("failed to load media streams with miniblocks in database", "error", err)
			migratedAllExistingStreams = true // stop attempting to load more streams this boot
		}

		// wait till there are only a few streams scheduled for migration before scheduling more.
		waitTillSmallNumberOfStreamsAreScheduled := true
		for waitTillSmallNumberOfStreamsAreScheduled {
			select {
			case <-m.stop:
				return
			case <-time.After(5 * time.Second):
				waitTillSmallNumberOfStreamsAreScheduled = m.streamsToMigrateToExternalStorage.Size() > 50
			}
		}
	}
}

// runStreamMigrationToExternalStorage migrates miniblocks of normalized ephemeral stream to external storage.
// Existing streams are scheduled with ephemeralStreamMonitor#runMigrateExistingMediaStreamsToExternalStorage.
// New streams are scheduled with ephemeralStreamMonitor#onSealed.
func (m *ephemeralStreamMonitor) runStreamMigrationToExternalStorage(ctx context.Context) {
	log := logging.FromCtx(ctx)

	log.Info("Enable media stream miniblock data in external storage",
		"migrateExistingStreams", m.migrateExistingMediaStreamsToExternalStorage)

	// schedule existing streams for migration if enabled through configuration
	go m.runMigrateExistingMediaStreamsToExternalStorage(ctx)

	for {
		select {
		case <-m.stop:
			log.Info("dead ephemeral stream monitor stopped")
			return
		case <-time.After(5 * time.Second):
			retryableFailedStreams := make(map[StreamId]int)
			stopped := false
			m.streamsToMigrateToExternalStorage.Range(func(streamID StreamId, retryCounter int) bool {
				if shouldRetry := m.migrateNormalizedEphemeralStream(ctx, streamID); shouldRetry {
					if retryCounter < MigrateToExternalStorageMaxRetries {
						retryableFailedStreams[streamID] = retryCounter + 1
					} else {
						m.streamsToMigrateToExternalStorage.Delete(streamID)
					}
				} else {
					m.streamsToMigrateToExternalStorage.Delete(streamID)
				}

				select {
				case <-m.stop:
					stopped = true
					return false
				case <-ctx.Done():
					stopped = true
					return false
				default:
					return true
				}
			})

			if !stopped { // reschedule migration for streams that failed as long monitor isn't stopped
				for streamId, retryCounter := range retryableFailedStreams {
					m.streamsToMigrateToExternalStorage.Store(streamId, retryCounter)
				}
			}
		case <-ctx.Done():
			m.close()
			return
		}
	}
}

// migrateNormalizedEphemeralStream tries to migrate the given stream to external storage.
// It returns true when the migration failed due to a temporary problem and can be retried later.
func (m *ephemeralStreamMonitor) migrateNormalizedEphemeralStream(
	ctx context.Context,
	streamID StreamId,
) bool {
	log := logging.FromCtx(ctx)
	retry, err := m.storage.MigrateMiniblocksToExternalStorage(ctx, streamID)
	if err != nil {
		log.Error("failed to migrate ephemeral stream miniblocks to external storage",
			"error", err, "streamId", streamID)
		return retry
	}

	logging.FromCtx(ctx).Info("migrated ephemeral stream miniblocks to external storage",
		"streamId", streamID)

	return false
}

// monitor is the main loop of the dead ephemeral stream clean up procedure.
func (m *ephemeralStreamMonitor) monitor(ctx context.Context) {
	const cleanupInterval = time.Minute
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.stop:
			logging.FromCtx(ctx).Info("dead ephemeral stream monitor stopped")
			return
		case <-ctx.Done():
			if err := ctx.Err(); !errors.Is(err, context.Canceled) {
				logging.FromCtx(ctx).Error("dead ephemeral stream monitor stopped", "error", err)
			}
			m.close()
			return
		case <-ticker.C:
			m.streams.Range(func(streamId StreamId, createdAt time.Time) bool {
				return m.handleStream(ctx, streamId, createdAt)
			})
		}
	}
}

// handleStream checks if an ephemeral stream is dead and deletes it if it is.
func (m *ephemeralStreamMonitor) handleStream(ctx context.Context, streamId StreamId, createdAt time.Time) bool {
	if time.Since(createdAt) <= m.ttl {
		return true
	}
	m.streams.Delete(streamId)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := m.storage.txRunner(
		ctx,
		"ephemeralStreamMonitor.handleStream",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			if _, err := m.storage.lockEphemeralStream(ctx, tx, streamId, true); err != nil {
				return err
			}

			_, err := tx.Exec(
				ctx,
				m.storage.sqlForStream(
					`DELETE from {{miniblocks}} WHERE stream_id = $1;
						 DELETE from {{minipools}} WHERE stream_id = $1;
						 DELETE FROM es WHERE stream_id = $1`,
					streamId),
				streamId,
			)
			return err
		},
		nil,
		"streamId", streamId,
	); err != nil {
		if !IsRiverErrorCode(err, Err_NOT_FOUND) {
			logging.FromCtx(ctx).Error("failed to delete dead ephemeral stream", "error", err, "streamId", streamId)
		}
	}

	return true
}

// loadEphemeralStreams loads all ephemeral streams from the database.
func (m *ephemeralStreamMonitor) loadEphemeralStreams(ctx context.Context) error {
	return m.storage.txRunner(
		ctx,
		"ephemeralStreamMonitor.loadEphemeralStreams",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			rows, err := tx.Query(ctx, "SELECT stream_id FROM es WHERE ephemeral = true")
			if err != nil {
				return err
			}

			var stream string
			_, err = pgx.ForEachRow(rows, []any{&stream}, func() error {
				streamId, err := StreamIdFromString(stream)
				if err != nil {
					return err
				}

				// This is fine to assume that the last update timestamp is now since this function
				// called only once on startup.
				m.streams.Store(streamId, time.Now())

				return nil
			})
			return err
		},
		nil,
	)
}
