package storage

import (
	"context"
	"errors"
	"sort"
	"time"

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
	storage           *PostgresStreamStore
	retentionInterval uint64
	minKeep           uint64
}

// newSnapshotTrimmer creates a new snapshot trimmer.
func newSnapshotTrimmer(
	ctx context.Context,
	storage *PostgresStreamStore,
	retentionInterval uint64,
) *snapshotTrimmer {
	if retentionInterval < minRetentionInterval {
		retentionInterval = minRetentionInterval
	}

	st := &snapshotTrimmer{
		storage:           storage,
		retentionInterval: retentionInterval,
		minKeep:           minKeep,
	}

	go st.start(ctx)

	return st
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

}

// determineSnapshotsToNullify returns the seq_nums whose snapshot field should be set to NULL,
// based on a retentionInterval in miniblocks and a minKeep window of the most recent miniblocks.
// We group snapshots into buckets [0..interval-1], [interval..2*interval-1], etc.,
// protect any seq_num > maxSeq - minKeep, and within each bucket nullify all but the latest.
//
//	snapshotSeqs:      sorted slice of seq_nums for which snapshot != NULL
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

	// find max seq and compute cutoff below which we may nullify
	maxSeq := snapshotSeqs[n-1]
	cutoff := maxSeq - minKeep

	// group by bucketID = seq / retentionInterval
	buckets := make(map[int64][]int64, n)
	for _, seq := range snapshotSeqs {
		if seq > cutoff {
			// protect this snapshot as it's within the last minKeep miniblocks
			continue
		}
		bucketID := seq / retentionInterval
		buckets[bucketID] = append(buckets[bucketID], seq)
	}

	var toNullify []int64
	for _, seqs := range buckets {
		if len(seqs) <= 1 {
			// either empty or only one snapshot in bucket → nothing to nullify
			continue
		}
		sort.Slice(seqs, func(i, j int) bool { return seqs[i] < seqs[j] })
		// nullify all except the latest in this bucket
		for _, s := range seqs[:len(seqs)-1] {
			toNullify = append(toNullify, s)
		}
	}

	// return sorted seq_nums to nullify
	sort.Slice(toNullify, func(i, j int) bool { return toNullify[i] < toNullify[j] })
	return toNullify
}
