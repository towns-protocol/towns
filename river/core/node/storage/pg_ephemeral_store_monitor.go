package storage

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/puzpuzpuz/xsync/v3"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// ephemeralStreamMonitor is a monitor that keeps track of ephemeral streams and cleans up dead ones.
type ephemeralStreamMonitor struct {
	// streams is a map of ephemeral stream IDs to the creation time.
	// This is used by the monitor to detect "dead" ephemeral streams and delete them.
	streams *xsync.MapOf[StreamId, time.Time]
	// ttl is the duration of time an ephemeral stream can exist
	// before either being sealed/normalized or deleted.
	ttl      time.Duration
	storage  *PostgresStreamStore
	stopOnce sync.Once
	stop     chan struct{}
}

// newEphemeralStreamMonitor creates and starts a dead ephemeral stream monitor.
func newEphemeralStreamMonitor(
	ctx context.Context,
	ttl time.Duration,
	storage *PostgresStreamStore,
) (*ephemeralStreamMonitor, error) {
	if ttl == 0 {
		ttl = time.Minute * 10
	}

	m := &ephemeralStreamMonitor{
		streams: xsync.NewMapOf[StreamId, time.Time](),
		storage: storage,
		ttl:     ttl,
		stop:    make(chan struct{}),
	}

	// Load all ephemeral streams from the database.
	if err := m.loadEphemeralStreams(ctx); err != nil {
		return nil, err
	}

	// Start the dead stream monitor.
	go m.monitor(ctx)

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

// onSealed is called when an ephemeral stream get sealed.
func (m *ephemeralStreamMonitor) onSealed(streamId StreamId) {
	m.streams.Delete(streamId)
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
				logging.FromCtx(ctx).Error("dead ephemeral stream monitor stopped", "err", err)
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
					streamId,
				),
				streamId,
			)
			return err
		},
		nil,
		"streamId", streamId,
	); err != nil {
		if !IsRiverErrorCode(err, Err_NOT_FOUND) {
			logging.FromCtx(ctx).Error("failed to delete dead ephemeral stream", "err", err, "streamId", streamId)
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
