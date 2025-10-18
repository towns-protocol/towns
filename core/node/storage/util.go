package storage

import (
	"slices"
	"sort"

	"github.com/jackc/pgx/v5/pgconn"
)

const (
	// MinRetentionIntervalMiniblocks is the minimum retention interval in miniblocks.
	// This ensures that even if the on-chain setting is very low, we still retain some snapshots.
	MinRetentionIntervalMiniblocks = 100

	// MinKeepMiniblocks is the number of most recent miniblocks to protect (no snapshot nullification).
	MinKeepMiniblocks = 100
)

// DetermineStreamSnapshotsToNullify returns the seq_nums whose snapshot field should be set to NULL.
// It scans snapshotSeqs (ascending), groups by bucket = seq_num/retentionInterval,
// keeps the very first seq in each bucket, and nullifies the rest—except anything
// newer than rangeEndInclusive-minKeep, which stays protected.
//
//	rangeStartInclusive: inclusive start of the miniblock range being processed
//	rangeEndInclusive:   inclusive end of the miniblock range being processed
//	snapshotSeqs:        sorted ascending slice of seq_nums within the range where snapshot != NULL
//	retentionInterval:   onchain setting, e.g. 1000 miniblocks
//	minKeep:             number of most recent miniblocks to protect
func DetermineStreamSnapshotsToNullify(
	rangeStartInclusive int64,
	rangeEndInclusive int64,
	snapshotSeqs []int64,
	retentionInterval int64,
	minKeep int64,
) []int64 {
	if retentionInterval <= 0 {
		return nil
	}

	// If the range is empty or has a single snapshot, nothing to nullify.
	n := len(snapshotSeqs)
	if n <= 1 {
		return nil
	}

	if rangeStartInclusive > rangeEndInclusive {
		return nil
	}

	cutoff := rangeEndInclusive - minKeep

	var toNullify []int64
	var lastBucket int64 = -1

	for _, seq := range snapshotSeqs {
		if seq < rangeStartInclusive {
			continue
		}
		// skip anything in the protected tail
		if seq > cutoff {
			break
		}
		bucket := seq / retentionInterval
		if bucket != lastBucket {
			// first snapshot in this bucket → keep it, advance bucket marker
			lastBucket = bucket
		} else {
			// subsequent snapshot in same bucket → nullify
			toNullify = append(toNullify, seq)
		}
	}
	return toNullify
}

// FindClosestSnapshotMiniblock returns the closest snapshot miniblock value that is
// <= startMbInclusive. If no such snapshot exists, it returns startMbInclusive itself.
func FindClosestSnapshotMiniblock(
	presentRanges []MiniblockRange,
	startMbInclusive int64,
) int64 {
	if len(presentRanges) == 0 {
		return startMbInclusive
	}

	// Find the rightmost range whose StartInclusive <= target.
	// i is the first index with StartInclusive > target; candidate is i-1.
	i := sort.Search(len(presentRanges), func(i int) bool {
		return presentRanges[i].StartInclusive > startMbInclusive
	})
	rIdx := i - 1
	if rIdx < 0 {
		// All ranges start after target => no snapshot <= target.
		return startMbInclusive
	}

	// Try the candidate range at rIdx first.
	if v, ok := floorInSnapshots(presentRanges[rIdx].SnapshotSeqNums, startMbInclusive); ok {
		return v
	}

	// If not found in that range (e.g., all snapshots there > target or empty),
	// walk left to find the nearest earlier range that has any snapshot,
	// in which case the best candidate is simply its last (largest) snapshot.
	for j := rIdx - 1; j >= 0; j-- {
		snaps := presentRanges[j].SnapshotSeqNums
		if len(snaps) > 0 {
			return snaps[len(snaps)-1]
		}
	}

	// Nothing <= target anywhere.
	return startMbInclusive
}

// floorInSnapshots returns the largest element <= target from a sorted []int64.
// Uses slices.BinarySearchFunc. If none, returns (0, false).
func floorInSnapshots(snaps []int64, target int64) (int64, bool) {
	if len(snaps) == 0 {
		return 0, false
	}

	idx, found := slices.BinarySearchFunc(snaps, target, func(e int64, t int64) int {
		switch {
		case e < t:
			return -1
		case e > t:
			return 1
		default:
			return 0
		}
	})
	if found {
		return target, true
	}

	if idx == 0 {
		return 0, false
	}

	return snaps[idx-1], true
}

// isPgError checks if an error of any of it's unwrap tree corresponds to a pg error
// that matches the type specified by pgerrcode.
func isPgError(err error, pgerrcode string) bool {
	if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code == pgerrcode {
		return true
	}

	switch x := err.(type) {
	case interface{ Unwrap() error }:
		if err = x.Unwrap(); err != nil {
			return isPgError(err, pgerrcode)
		}
	case interface{ Unwrap() []error }:
		for _, err := range x.Unwrap() {
			if isPgError(err, pgerrcode) {
				return true
			}
		}
	}
	return false
}
