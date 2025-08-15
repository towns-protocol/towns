package events

import (
	"slices"

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
