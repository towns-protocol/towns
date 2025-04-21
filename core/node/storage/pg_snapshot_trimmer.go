package storage

import (
	"context"
	"errors"
	"sort"
	"time"

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
	minKeep uint64
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

}

// runStreamTrimming runs the stream trimming logic.
func (st *snapshotTrimmer) runStreamTrimming(ctx context.Context, streamId StreamId) {
	// st.config.Get().StreamSnapshotIntervalInMiniblocks
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
