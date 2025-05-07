package storage

import (
	"context"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// streamTrimmer handles periodic trimming of space streams
type streamTrimmer struct {
	store            *PostgresStreamStore
	miniblocksToKeep int64
	log              *logging.Log

	streamsLock sync.Mutex
	streams     []StreamId

	wg       sync.WaitGroup
	stopOnce sync.Once
	stop     chan struct{}
}

// newStreamTrimmer creates a new stream trimmer
func newStreamTrimmer(
	ctx context.Context,
	store *PostgresStreamStore,
	miniblocksToKeep int64,
) (*streamTrimmer, error) {
	st := &streamTrimmer{
		store:            store,
		miniblocksToKeep: miniblocksToKeep,
		log:              logging.FromCtx(ctx),
		stop:             make(chan struct{}),
	}

	// Load all space streams from the database.
	if err := st.loadSpaceStreams(ctx); err != nil {
		return nil, err
	}

	// Start the stream trimmer
	st.start(ctx)

	return st, nil
}

// start starts the stream trimmer
func (t *streamTrimmer) start(ctx context.Context) {
	t.wg.Add(1)
	defer t.wg.Done()

	t.log.Info("Starting stream trimmer")
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				t.log.Info("Stream trimmer stopped due to context cancellation", "err", ctx.Err())
				return
			case <-t.stop:
				t.log.Info("Stream trimmer stopped due to stop signal")
				t.close()
				return
			case <-ticker.C:
				t.log.Debug("Starting periodic trim operation")
				t.trimStreams(ctx)
			}
		}
	}()
}

// close stops the stream trimmer
func (t *streamTrimmer) close() {
	t.stopOnce.Do(func() {
		close(t.stop)
	})
	t.wg.Wait()
}

// onCreated is called when a new stream is created.
func (t *streamTrimmer) onCreated(streamId StreamId) {
	if ValidSpaceStreamId(&streamId) {
		t.streamsLock.Lock()
		t.streams = append(t.streams, streamId)
		t.streamsLock.Unlock()
	}
}

func (t *streamTrimmer) trimStreams(ctx context.Context) {
	const workersCount = 4

	// Copy streams to avoid holding the lock while processing
	t.streamsLock.Lock()
	streams := make([]StreamId, len(t.streams))
	copy(streams, t.streams)
	t.streamsLock.Unlock()

	if len(streams) == 0 {
		t.log.Debug("No space streams to trim")
		return
	}

	t.log.Infow("Starting trim operation",
		"totalStreams", len(streams),
		"spaceStreams", len(streams),
	)

	// Create a worker pool
	streamCh := make(chan StreamId, len(streams))
	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < workersCount; i++ {
		wg.Add(1)
		go func(workerId int) {
			defer wg.Done()
			t.log.Debugw("Worker started", "workerId", workerId)
			for stream := range streamCh {
				if err := t.trimStream(ctx, stream); err != nil {
					t.log.Errorw("Failed to trim stream",
						"stream", stream,
						"err", err,
					)
				}
			}
			t.log.Debugw("Worker finished", "workerId", workerId)
		}(i)
	}

	// Send streams to workers
	for _, stream := range streams {
		streamCh <- stream
	}
	close(streamCh)

	// Wait for all workers to finish
	wg.Wait()

	t.log.Infow("Completed trim operation", "totalStreams", len(streams))
}

// trimStream deletes old miniblocks for streams (10xxx streams only for now) keeping only the specified number of miniblocks
// before the last snapshot. The deletion is done in batches to avoid long-running transactions.
func (t *streamTrimmer) trimStream(
	ctx context.Context,
	streamId StreamId,
) error {
	return t.store.txRunner(
		ctx,
		"streamTrimmer.trimStream",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return t.trimStreamTx(ctx, tx, streamId)
		},
		nil,
		"streamId", streamId,
		"miniblocksToKeep", t.miniblocksToKeep,
	)
}

func (t *streamTrimmer) trimStreamTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	// Get the last snapshot miniblock number
	lastSnapshotMiniblock, err := t.store.lockStream(ctx, tx, streamId, true)
	if err != nil {
		return err
	}

	// Calculate the miniblock number to keep (last snapshot - miniblocksToKeep)
	miniblockToKeep := lastSnapshotMiniblock - t.miniblocksToKeep
	if miniblockToKeep <= 0 {
		return nil // Nothing to trim
	}

	// Delete miniblocks in batches
	const batchSize = 1000
	for {
		// Use CTID for efficient deletion
		rows, err := tx.Query(
			ctx,
			t.store.sqlForStream(
				`WITH rows_to_delete AS (
					SELECT ctid
					FROM {{miniblocks}}
					WHERE seq_num < $1
					LIMIT $2
				)
				DELETE FROM {{miniblocks}}
				WHERE ctid IN (SELECT ctid FROM rows_to_delete)
				RETURNING *`,
				streamId,
			),
			miniblockToKeep,
			batchSize,
		)
		if err != nil {
			return err
		}

		// Check if any rows were deleted
		var deletedCount int
		for rows.Next() {
			deletedCount++
		}
		rows.Close()

		if deletedCount == 0 {
			break // No more rows to delete
		}
	}

	return nil
}

// loadEphemeralStreams loads all space streams from the database.
// This function is called only once on startup to load the streams into memory.
// Ignoring ephemeral streams.
func (t *streamTrimmer) loadSpaceStreams(ctx context.Context) error {
	return t.store.txRunner(
		ctx,
		"streamTrimmer.loadSpaceStreams",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			rows, err := tx.Query(ctx, "SELECT stream_id FROM es WHERE ephemeral = false")
			if err != nil {
				return err
			}

			var stream string
			_, err = pgx.ForEachRow(rows, []any{&stream}, func() error {
				streamId, err := StreamIdFromString(stream)
				if err != nil {
					return err
				}

				if ValidSpaceStreamId(&streamId) {
					t.streamsLock.Lock()
					t.streams = append(t.streams, streamId)
					t.streamsLock.Unlock()
				}

				return nil
			})
			return err
		},
		nil,
	)
}
