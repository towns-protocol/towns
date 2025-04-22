package storage

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/puzpuzpuz/xsync/v4"

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

	// streams is the map of stream IDs to their last processed snapshot miniblock number.
	streams *xsync.Map[StreamId, int64]
}

// newSnapshotTrimmer creates a new snapshot trimmer.
func newSnapshotTrimmer(
	ctx context.Context,
	storage *PostgresStreamStore,
	config crypto.OnChainConfiguration,
) (*snapshotTrimmer, error) {
	// Load all existing stream IDs into the in-mem cache
	streamIDs, err := storage.GetStreams(ctx)
	if err != nil {
		return nil, err
	}

	streams := xsync.NewMap[StreamId, int64]()
	for _, streamID := range streamIDs {
		streams.Store(streamID, 0)
	}

	st := &snapshotTrimmer{
		storage: storage,
		config:  config,
		minKeep: minKeep,
		streams: streams,
	}

	go st.start(ctx)

	return st, nil
}

// onCreated is called when a new stream is created.
func (st *snapshotTrimmer) onCreated(streamId StreamId) {
	st.streams.Store(streamId, 0)
}

// start starts the snapshot trimmer.
func (st *snapshotTrimmer) start(ctx context.Context) {
	ticker := time.NewTicker(snapshotsTrimmingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			st.trimStreams(ctx)
		case <-ctx.Done():
			if err := ctx.Err(); !errors.Is(err, context.Canceled) {
				logging.FromCtx(ctx).Error("snapshots trimmer stopped", "err", err)
			}
			return
		}
	}
}

// trimStreams runs the snapshot trimming logic for all streams.
func (st *snapshotTrimmer) trimStreams(ctx context.Context) {
	// Retention interval could be changed at any time so the current value must be used
	retentionInterval := int64(st.config.Get().StreamSnapshotIntervalInMiniblocks)
	if retentionInterval < minRetentionInterval {
		retentionInterval = minRetentionInterval
	}

	// Iterate over all streams and trim them
	st.streams.Range(func(streamId StreamId, lastMbNum int64) bool {
		ctx, cancel := context.WithTimeout(ctx, time.Minute)
		if err := st.storage.txRunner(
			ctx,
			"snapshotTrimmer.trimStreams",
			pgx.ReadOnly,
			func(ctx context.Context, tx pgx.Tx) error {
				return st.trimStream(ctx, tx, streamId, lastMbNum, retentionInterval)
			},
			nil,
			"streamId", streamId,
			"lastMbNum", lastMbNum,
			"retentionInterval", retentionInterval,
		); err != nil {
			logging.FromCtx(ctx).Error("failed to trim the stream",
				"retentionInterval", retentionInterval,
				"streamId", streamId,
				"err", err)
		}
		cancel()
		return true
	})
}

// trimStream trims the snapshots for the given stream.
func (st *snapshotTrimmer) trimStream(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	lastMbNum int64,
	retentionInterval int64,
) error {
	// Collect all miniblocks with a snapshot for the given stream starting from the last processed miniblock number.
	// Genesis miniblock must not be trimmed.
	snapshotMiniblockRows, err := tx.Query(
		ctx,
		st.storage.sqlForStream(
			"SELECT seq_num FROM {{miniblocks}} WHERE stream_id = $1 AND seq_num > $2 AND snapshot IS NOT NULL",
			streamId,
		),
		streamId, lastMbNum,
	)
	if err != nil {
		return err
	}

	var mbs []int64
	var mbNum int64
	if _, err = pgx.ForEachRow(snapshotMiniblockRows, []any{&mbNum}, func() error {
		mbs = append(mbs, mbNum)
		return nil
	}); err != nil {
		return err
	}

	// Determine which miniblocks should be nullified
	toNullify := determineSnapshotsToNullify(mbs, retentionInterval, st.minKeep)
	if len(toNullify) == 0 {
		// If there are no miniblocks with snapshots, store (last miniblock number - minKeep) as the last processed one.
		lastMiniblockNum, err := st.storage.GetLastMiniblockNumber(ctx, streamId)
		if err != nil {
			return err
		}

		if cutoff := lastMiniblockNum - minKeep; cutoff > 0 {
			st.streams.Store(streamId, cutoff)
		}

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
		return err
	}

	// Update last processed miniblock number
	if cutoff := mbs[len(mbs)-1] - minKeep; cutoff > 0 {
		st.streams.Store(streamId, cutoff)
	}

	return nil
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
