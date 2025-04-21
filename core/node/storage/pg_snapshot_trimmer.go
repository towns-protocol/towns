package storage

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	// minRetentionInterval is the min retention interval for snapshots.
	minRetentionInterval = 1000 // 1000 miniblocks

	// minKeep is the number of most recent miniblocks to protect (no nullification)
	minKeep = 1000 // 1000 miniblocks

	// snapshotsTrimmingInterval is the interval at which we check for snapshots to nullify.
	snapshotsTrimmingInterval = time.Hour
)

// snapshotTrimmer contains a logic that handles the trimming of snapshots in the database.
type snapshotTrimmer struct {
	storage *PostgresStreamStore
	config  crypto.OnChainConfiguration
	minKeep int64
}

// newSnapshotTrimmer creates a new snapshot trimmer.
func newSnapshotTrimmer(
	ctx context.Context,
	storage *PostgresStreamStore,
	config crypto.OnChainConfiguration,
) (*snapshotTrimmer, error) {
	st := &snapshotTrimmer{
		storage: storage,
		config:  config,
		minKeep: minKeep,
	}

	go st.start(ctx)

	return st, nil
}

// start starts the snapshot trimmer.
func (st *snapshotTrimmer) start(ctx context.Context) {
	ticker := time.NewTicker(snapshotsTrimmingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			st.runTrimming(ctx)
		case <-ctx.Done():
			if err := ctx.Err(); !errors.Is(err, context.Canceled) {
				logging.FromCtx(ctx).Error("snapshots trimmer stopped", "err", err)
			}
			return
		}
	}
}

// runSnapshotTrimming runs the snapshot trimming logic.
func (st *snapshotTrimmer) runTrimming(ctx context.Context) {
	ctx, cancel := context.WithTimeout(ctx, time.Minute*10)
	defer cancel()

	if err := st.storage.txRunner(
		ctx,
		"snapshotTrimmer.runTrimming",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			streamRows, err := tx.Query(ctx, "SELECT stream_id FROM es WHERE ephemeral = false")
			if err != nil {
				return err
			}

			// For each snapshot, select all snapshot miniblock numbers and pass them to the callback
			var streamIdRaw string
			_, err = pgx.ForEachRow(streamRows, []any{&streamIdRaw}, func() error {
				streamId, err := StreamIdFromString(streamIdRaw)
				if err != nil {
					logging.FromCtx(ctx).Error(
						"failed to parse streamId",
						"streamId", streamIdRaw,
						"err", err,
					)
					return nil
				}

				// TODO: AND seq_num > seqNum
				snapshotMiniblockRows, err := tx.Query(
					ctx,
					st.storage.sqlForStream(
						"SELECT seq_num FROM {{miniblocks}} WHERE stream_id = $1 AND snapshot IS NOT NULL",
						streamId,
					),
					streamId,
				)
				if err != nil {
					logging.FromCtx(ctx).Error(
						"failed to read snapshot miniblocks",
						"streamId", streamId,
						"err", err,
					)
					return nil
				}

				var mbs []int64
				var mbNum int64
				if _, err = pgx.ForEachRow(snapshotMiniblockRows, []any{&mbNum}, func() error {
					mbs = append(mbs, mbNum)
					return nil
				}); err != nil {
					logging.FromCtx(ctx).Error(
						"failed to read snapshot miniblocks",
						"streamId", streamId,
						"err", err,
					)
					return nil
				}

				retentionInterval := int64(st.config.Get().StreamSnapshotIntervalInMiniblocks)
				if retentionInterval < minRetentionInterval {
					retentionInterval = minRetentionInterval
				}

				// Determine which miniblocks should be nullified
				toNullify := determineSnapshotsToNullify(mbs, retentionInterval, st.minKeep)
				if len(toNullify) == 0 {
					return nil
				}

				// Reset snapshot field for the given miniblocks
				if _, err = tx.Exec(
					ctx,
					st.storage.sqlForStream(
						"UPDATE {{miniblocks}} SET snapshot = NULL WHERE stream_id = $1 AND seq_num = ANY($2)",
						streamId,
					),
					streamId,
					mbs,
				); err != nil {
					logging.FromCtx(ctx).Error(
						"failed to nullify snapshots",
						"streamId", streamId,
						"miniblocks", mbs,
						"err", err,
					)
					return nil
				}

				return nil
			})
			return err
		},
		nil,
	); err != nil {
		logging.FromCtx(ctx).Error("failed to run stream trimming", "err", err)
	}
}

// determineSnapshotsToNullify returns the seq_nums whose snapshot field should be set to NULL.
// It does a single reverse‐scan over the sorted snapshotSeqs, grouping by
// bucket = seq_num / retentionInterval, and skipping the first seq in each bucket
// (the “latest” snapshot).  Any seq > maxSeq - minKeep is also protected.
// Final result is returned in ascending order.
//
//	snapshotSeqs:      sorted slice of seq_nums where snapshot != NULL
//	retentionInterval: onchain setting, e.g. 1000 miniblocks
//	minKeep:           number of most recent miniblocks to protect (no nullification)
func determineSnapshotsToNullify(
	snapshotSeqs []int64,
	retentionInterval int64,
	minKeep int64,
) []int64 {
	n := len(snapshotSeqs)
	if n == 0 {
		return nil
	}

	maxSeq := snapshotSeqs[n-1]
	cutoff := maxSeq - minKeep

	var toNullify []int64
	var seenBucket int64 = -1

	// Reverse‐scan: newest first
	for i := n - 1; i >= 0; i-- {
		seq := snapshotSeqs[i]
		if seq > cutoff {
			// still within the protected tail window
			continue
		}
		bucket := seq / retentionInterval
		if bucket == seenBucket {
			// we've already kept one snapshot in this bucket,
			// so this one can be nullified
			toNullify = append(toNullify, seq)
		} else {
			// first time we hit this bucket (i.e. the latest in it)
			seenBucket = bucket
		}
	}

	// return in ascending order
	sort.Slice(toNullify, func(i, j int) bool { return toNullify[i] < toNullify[j] })
	return toNullify
}
