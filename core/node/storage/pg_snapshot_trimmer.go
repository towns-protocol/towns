package storage

import (
	"context"
	"sort"
)

type snapshotTrimmer struct {
}

func newSnapshotTrimmer(ctx context.Context) *snapshotTrimmer {
	st := &snapshotTrimmer{}

	go st.start(ctx)

	return st
}

func (st *snapshotTrimmer) start(ctx context.Context) {

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
