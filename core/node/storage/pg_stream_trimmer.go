package storage

import (
	"context"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// streamTrimmerConfig holds configuration for the stream trimmer
type streamTrimmerConfig struct {
	// miniblocksToKeep is the number of miniblocks to keep before the last snapshot
	miniblocksToKeep int64
	// trimInterval is how often to run the trim operation
	trimInterval time.Duration
	// workerCount is the number of concurrent workers for trimming
	workerCount int
}

// defaultStreamTrimmerConfig returns default configuration for the stream trimmer
func defaultStreamTrimmerConfig() *streamTrimmerConfig {
	return &streamTrimmerConfig{
		miniblocksToKeep: 1000, // Keep 1000 miniblocks before last snapshot
		trimInterval:     time.Hour,
		workerCount:      4,
	}
}

// streamTrimmer handles periodic trimming of space streams
type streamTrimmer struct {
	store  *PostgresStreamStore
	config *streamTrimmerConfig
	log    *logging.Log

	stopCh chan struct{}
	wg     sync.WaitGroup
}

// newStreamTrimmer creates a new stream trimmer
func newStreamTrimmer(
	ctx context.Context,
	store *PostgresStreamStore,
	config *streamTrimmerConfig,
) *streamTrimmer {
	st := &streamTrimmer{
		store:  store,
		config: config,
		log:    logging.FromCtx(ctx),
		stopCh: make(chan struct{}),
	}

	st.start(ctx)

	return st
}

// start starts the stream trimmer
func (t *streamTrimmer) start(ctx context.Context) {
	t.wg.Add(1)
	defer t.wg.Done()

	go func() {
		ticker := time.NewTicker(t.config.trimInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-t.stopCh:
				return
			case <-ticker.C:
				t.trimStreams(ctx)
			}
		}
	}()
}

// close stops the stream trimmer
func (t *streamTrimmer) close() {
	close(t.stopCh)
	t.wg.Wait()
}

func (t *streamTrimmer) trimStreams(ctx context.Context) {
	// Get all streams
	streams, err := t.store.GetStreams(ctx)
	if err != nil {
		t.log.Errorw("Failed to get streams for trimming", "error", err)
		return
	}

	// Filter space streams (10xxx)
	var spaceStreams []StreamId
	for _, stream := range streams {
		if ValidSpaceStreamId(&stream) {
			spaceStreams = append(spaceStreams, stream)
		}
	}

	if len(spaceStreams) == 0 {
		t.log.Debug("No space streams to trim")
		return
	}

	// Create a worker pool
	streamCh := make(chan StreamId, len(spaceStreams))
	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < t.config.workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for stream := range streamCh {
				if err := t.trimStream(ctx, stream, t.config.miniblocksToKeep); err != nil {
					t.log.Errorw("Failed to trim stream",
						"stream", stream,
						"err", err,
					)
				}
			}
		}()
	}

	// Send streams to workers
	for _, stream := range spaceStreams {
		streamCh <- stream
	}
	close(streamCh)

	// Wait for all workers to finish
	wg.Wait()
}

// trimStream deletes old miniblocks for streams (10xxx streams only for now) keeping only the specified number of miniblocks
// before the last snapshot. The deletion is done in batches to avoid long-running transactions.
func (t *streamTrimmer) trimStream(
	ctx context.Context,
	streamId StreamId,
	miniblocksToKeep int64,
) error {
	return t.store.txRunner(
		ctx,
		"streamTrimmer.trimStream",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return t.trimStreamTx(ctx, tx, streamId, miniblocksToKeep)
		},
		nil,
		"streamId", streamId,
		"miniblocksToKeep", miniblocksToKeep,
	)
}

func (t *streamTrimmer) trimStreamTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	miniblocksToKeep int64,
) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	// Get the last snapshot miniblock number
	lastSnapshotMiniblock, err := t.store.lockStream(ctx, tx, streamId, true)
	if err != nil {
		return err
	}

	// Calculate the miniblock number to keep (last snapshot - miniblocksToKeep)
	miniblockToKeep := lastSnapshotMiniblock - miniblocksToKeep
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
