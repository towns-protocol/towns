package events

import (
	"slices"
	"sort"

	"github.com/towns-protocol/towns/core/node/storage"
)

// calculateMissingRanges identifies gaps in a sequence of miniblock ranges.
//
// Given a set of present miniblock ranges and a desired range [startMbInclusive, endMbInclusive],
// this function returns the ranges that are missing (i.e., the gaps).
//
// This function is used during backwards reconciliation to identify which miniblock ranges
// need to be fetched from remote replicas to fill gaps in the local storage.
//
// Parameters:
//   - presentRanges: The ranges of miniblocks that are already present in storage.
//     These ranges may be unsorted and may overlap.
//   - startMbInclusive: The start of the desired range (inclusive).
//   - endMbInclusive: The end of the desired range (inclusive).
//
// Returns:
//   - A slice of MiniblockRange representing the missing ranges (gaps).
//   - Returns nil if startMbInclusive > endMbInclusive.
//   - Returns an empty slice if there are no gaps (all blocks in the range are present).
//
// Example:
//
//	presentRanges: [{10, 20}, {30, 40}]
//	startMbInclusive: 0
//	endMbInclusive: 50
//	Returns: [{0, 9}, {21, 29}, {41, 50}]
//
// The function handles various edge cases:
//   - Present ranges that extend beyond the requested range
//   - Present ranges that partially overlap the requested range
//   - Present ranges that are completely outside the requested range
//   - Overlapping present ranges
//   - Unsorted present ranges (the function sorts them internally)
func calculateMissingRanges(
	presentRanges []storage.MiniblockRange,
	startMbInclusive, endMbInclusive int64,
) []storage.MiniblockRange {
	// Handle edge cases
	if startMbInclusive > endMbInclusive {
		return nil
	}

	// If no present ranges, the entire range is missing
	if len(presentRanges) == 0 {
		return []storage.MiniblockRange{{StartInclusive: startMbInclusive, EndInclusive: endMbInclusive}}
	}

	// Sort present ranges by start position to ensure proper processing
	// Create a copy to avoid modifying the input
	sortedRanges := make([]storage.MiniblockRange, len(presentRanges))
	copy(sortedRanges, presentRanges)

	// Sort by StartInclusive
	slices.SortFunc(sortedRanges, func(a, b storage.MiniblockRange) int {
		if a.StartInclusive < b.StartInclusive {
			return -1
		}
		if a.StartInclusive > b.StartInclusive {
			return 1
		}
		return 0
	})

	missingRanges := []storage.MiniblockRange{}
	currentStart := startMbInclusive

	for _, presentRange := range sortedRanges {
		// Skip ranges that are completely outside our bounds
		if presentRange.EndInclusive < startMbInclusive || presentRange.StartInclusive > endMbInclusive {
			continue
		}

		// If there's a gap before this present range
		if currentStart < presentRange.StartInclusive {
			gapEnd := presentRange.StartInclusive - 1
			if gapEnd > endMbInclusive {
				gapEnd = endMbInclusive
			}
			if currentStart <= gapEnd {
				missingRanges = append(missingRanges, storage.MiniblockRange{
					StartInclusive: currentStart,
					EndInclusive:   gapEnd,
				})
			}
		}

		// Update current position to after this present range
		if presentRange.EndInclusive >= currentStart {
			currentStart = presentRange.EndInclusive + 1
		}

		// If we've covered the entire requested range, we're done
		if currentStart > endMbInclusive {
			break
		}
	}

	// Check if there's a gap after the last present range
	if currentStart <= endMbInclusive {
		missingRanges = append(missingRanges, storage.MiniblockRange{
			StartInclusive: currentStart,
			EndInclusive:   endMbInclusive,
		})
	}

	return missingRanges
}

// findClosestSnapshotMiniblock returns the closest snapshot miniblock value that is
// <= startMbInclusive. If no such snapshot exists, it returns startMbInclusive itself.
func findClosestSnapshotMiniblock(
	presentRanges []storage.MiniblockRange,
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

// determineRangeSnapshotsToNullify walks the snapshot-bearing miniblocks inside rng and
// returns those that should have their snapshot field cleared based on the retention interval.
//
// The range is partitioned into buckets of width retentionInterval starting from
// rng.StartInclusive. For each bucket, the earliest snapshot miniblock is kept and
// subsequent snapshots in the same bucket are scheduled for nullification. The
// caller guarantees that the range has not been snapshot trimmed, so every bucket
// retains at least the first snapshot it encounters.
func determineRangeSnapshotsToNullify(
	rng storage.MiniblockRange,
	retentionInterval int64,
) []int64 {
	if retentionInterval <= 0 {
		return nil
	}

	// If the range is empty or has a single snapshot, nothing to nullify.
	snaps := rng.SnapshotSeqNums
	if len(snaps) <= 1 {
		return nil
	}

	var (
		currentBucket int64
		haveBucket    bool
		toNullify     []int64
	)

	for _, seq := range snaps {
		if seq < rng.StartInclusive || seq > rng.EndInclusive {
			continue
		}

		bucket := (seq - rng.StartInclusive) / retentionInterval
		if !haveBucket || bucket != currentBucket {
			currentBucket = bucket
			haveBucket = true
			continue
		}

		toNullify = append(toNullify, seq)
	}

	return toNullify
}
