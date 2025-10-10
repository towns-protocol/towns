package events

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/storage"
)

func TestCalculateMissingRanges(t *testing.T) {
	tests := []struct {
		name           string
		presentRanges  []storage.MiniblockRange
		startInclusive int64
		endInclusive   int64
		expected       []storage.MiniblockRange
	}{
		{
			name:           "nil present ranges - entire range is missing",
			presentRanges:  nil,
			startInclusive: 0,
			endInclusive:   10,
			expected: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 10},
			},
		},
		{
			name:           "no present ranges - entire range is missing",
			presentRanges:  []storage.MiniblockRange{},
			startInclusive: 0,
			endInclusive:   10,
			expected: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 10},
			},
		},
		{
			name: "single present range covers entire requested range",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 10},
			},
			startInclusive: 0,
			endInclusive:   10,
			expected:       []storage.MiniblockRange{},
		},
		{
			name: "single present range in middle - gaps at both ends",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 5, EndInclusive: 7},
			},
			startInclusive: 0,
			endInclusive:   10,
			expected: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 4},
				{StartInclusive: 8, EndInclusive: 10},
			},
		},
		{
			name: "multiple present ranges - gaps between them",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 2, EndInclusive: 3},
				{StartInclusive: 6, EndInclusive: 7},
			},
			startInclusive: 0,
			endInclusive:   10,
			expected: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 1},
				{StartInclusive: 4, EndInclusive: 5},
				{StartInclusive: 8, EndInclusive: 10},
			},
		},
		{
			name: "present ranges not sorted - should handle correctly",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 6, EndInclusive: 7},
				{StartInclusive: 2, EndInclusive: 3},
			},
			startInclusive: 0,
			endInclusive:   10,
			expected: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 1},
				{StartInclusive: 4, EndInclusive: 5},
				{StartInclusive: 8, EndInclusive: 10},
			},
		},
		{
			name: "present range extends beyond requested range",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: -5, EndInclusive: 15},
			},
			startInclusive: 0,
			endInclusive:   10,
			expected:       []storage.MiniblockRange{},
		},
		{
			name: "present ranges partially overlap requested range",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: -5, EndInclusive: 2},
				{StartInclusive: 8, EndInclusive: 15},
			},
			startInclusive: 0,
			endInclusive:   10,
			expected: []storage.MiniblockRange{
				{StartInclusive: 3, EndInclusive: 7},
			},
		},
		{
			name: "present ranges completely outside requested range",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: -10, EndInclusive: -5},
				{StartInclusive: 15, EndInclusive: 20},
			},
			startInclusive: 0,
			endInclusive:   10,
			expected: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 10},
			},
		},
		{
			name:           "invalid range - start greater than end",
			presentRanges:  []storage.MiniblockRange{},
			startInclusive: 10,
			endInclusive:   5,
			expected:       nil,
		},
		{
			name:           "single block range",
			presentRanges:  []storage.MiniblockRange{},
			startInclusive: 5,
			endInclusive:   5,
			expected: []storage.MiniblockRange{
				{StartInclusive: 5, EndInclusive: 5},
			},
		},
		{
			name: "adjacent present ranges - no gap between them",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 2, EndInclusive: 4},
				{StartInclusive: 5, EndInclusive: 7},
			},
			startInclusive: 0,
			endInclusive:   10,
			expected: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 1},
				{StartInclusive: 8, EndInclusive: 10},
			},
		},
		{
			name: "overlapping present ranges",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 2, EndInclusive: 6},
				{StartInclusive: 4, EndInclusive: 8},
			},
			startInclusive: 0,
			endInclusive:   10,
			expected: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 1},
				{StartInclusive: 9, EndInclusive: 10},
			},
		},
		{
			name: "large gap scenario for backwards reconciliation",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 100, EndInclusive: 150},
			},
			startInclusive: 50,
			endInclusive:   200,
			expected: []storage.MiniblockRange{
				{StartInclusive: 50, EndInclusive: 99},
				{StartInclusive: 151, EndInclusive: 200},
			},
		},
		{
			name: "non-contiguous miniblocks scenario",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 49},
				{StartInclusive: 100, EndInclusive: 149},
				{StartInclusive: 200, EndInclusive: 249},
			},
			startInclusive: 0,
			endInclusive:   300,
			expected: []storage.MiniblockRange{
				{StartInclusive: 50, EndInclusive: 99},
				{StartInclusive: 150, EndInclusive: 199},
				{StartInclusive: 250, EndInclusive: 300},
			},
		},
		{
			name: "trim limit scenario - missing range before trim limit",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 150, EndInclusive: 200},
			},
			startInclusive: 100, // trim limit
			endInclusive:   200,
			expected: []storage.MiniblockRange{
				{StartInclusive: 100, EndInclusive: 149},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateMissingRanges(tt.presentRanges, tt.startInclusive, tt.endInclusive)
			require.Equal(t, tt.expected, result)
		})
	}
}

func TestFindClosestSnapshotMiniblock(t *testing.T) {
	tests := []struct {
		name          string
		presentRanges []storage.MiniblockRange
		start         int64
		expected      int64
	}{
		{
			name: "exact snapshot match",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 10, SnapshotSeqNums: []int64{3, 7, 10}},
			},
			start:    10,
			expected: 10,
		},
		{
			name: "nearest lower snapshot across ranges",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 5, SnapshotSeqNums: []int64{0, 2, 5}},
				{StartInclusive: 10, EndInclusive: 20, SnapshotSeqNums: []int64{12, 16, 20}},
			},
			start:    18,
			expected: 16,
		},
		{
			name: "start before any snapshot",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 5, EndInclusive: 10, SnapshotSeqNums: []int64{5, 8}},
			},
			start:    3,
			expected: 3,
		},
		{
			name: "no snapshots available",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 5},
				{StartInclusive: 10, EndInclusive: 15},
			},
			start:    12,
			expected: 12,
		},
		{
			name: "snapshots outside range are ignored",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 10, EndInclusive: 20, SnapshotSeqNums: []int64{25, 30}},
			},
			start:    15,
			expected: 15,
		},
		{
			name: "duplicate snapshot values",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 0, EndInclusive: 10, SnapshotSeqNums: []int64{4, 4, 1}},
			},
			start:    9,
			expected: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := findClosestSnapshotMiniblock(tt.presentRanges, tt.start)
			require.Equal(t, tt.expected, result)
		})
	}
}

func TestCalculateMissingRangesEdgeCases(t *testing.T) {
	t.Run("empty present ranges with large range", func(t *testing.T) {
		result := calculateMissingRanges([]storage.MiniblockRange{}, 0, 1000000)
		require.Equal(t, []storage.MiniblockRange{
			{StartInclusive: 0, EndInclusive: 1000000},
		}, result)
	})

	t.Run("many small present ranges", func(t *testing.T) {
		presentRanges := []storage.MiniblockRange{}
		for i := int64(0); i < 100; i += 10 {
			presentRanges = append(presentRanges, storage.MiniblockRange{
				StartInclusive: i,
				EndInclusive:   i + 2,
			})
		}

		result := calculateMissingRanges(presentRanges, 0, 100)

		// Verify we have gaps between each present range
		require.Greater(t, len(result), 0)

		// Check first gap
		require.Equal(t, int64(3), result[0].StartInclusive)
		require.Equal(t, int64(9), result[0].EndInclusive)
	})

	t.Run("present range with negative values", func(t *testing.T) {
		presentRanges := []storage.MiniblockRange{
			{StartInclusive: -10, EndInclusive: -5},
			{StartInclusive: 5, EndInclusive: 10},
		}

		result := calculateMissingRanges(presentRanges, -15, 15)

		expected := []storage.MiniblockRange{
			{StartInclusive: -15, EndInclusive: -11},
			{StartInclusive: -4, EndInclusive: 4},
			{StartInclusive: 11, EndInclusive: 15},
		}

		require.Equal(t, expected, result)
	})
}

func TestCalculateMissingRangesStability(t *testing.T) {
	t.Run("does not modify input slice", func(t *testing.T) {
		originalRanges := []storage.MiniblockRange{
			{StartInclusive: 6, EndInclusive: 7},
			{StartInclusive: 2, EndInclusive: 3},
		}

		// Make a copy to verify the original isn't modified
		inputCopy := make([]storage.MiniblockRange, len(originalRanges))
		copy(inputCopy, originalRanges)

		_ = calculateMissingRanges(originalRanges, 0, 10)

		// Verify original slice wasn't modified
		require.Equal(t, inputCopy, originalRanges)
	})
}

func BenchmarkCalculateMissingRanges(b *testing.B) {
	// Benchmark with various scenarios
	scenarios := []struct {
		name          string
		presentRanges []storage.MiniblockRange
	}{
		{
			name:          "no present ranges",
			presentRanges: []storage.MiniblockRange{},
		},
		{
			name: "few present ranges",
			presentRanges: []storage.MiniblockRange{
				{StartInclusive: 10, EndInclusive: 20},
				{StartInclusive: 30, EndInclusive: 40},
				{StartInclusive: 50, EndInclusive: 60},
			},
		},
		{
			name: "many present ranges",
			presentRanges: func() []storage.MiniblockRange {
				ranges := make([]storage.MiniblockRange, 50)
				for i := 0; i < 50; i++ {
					start := int64(i * 10)
					ranges[i] = storage.MiniblockRange{
						StartInclusive: start,
						EndInclusive:   start + 5,
					}
				}
				return ranges
			}(),
		},
	}

	for _, scenario := range scenarios {
		b.Run(scenario.name, func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = calculateMissingRanges(scenario.presentRanges, 0, 1000)
			}
		})
	}
}
