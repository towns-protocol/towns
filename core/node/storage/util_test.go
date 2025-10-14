package storage

import (
	"sort"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDetermineSnapshotsToNullify(t *testing.T) {
	testTable := []struct {
		name              string
		rangeStart        int64
		rangeEnd          int64
		snapshotSeqs      []int64
		retentionInterval int64
		minKeep           int64
		expected          []int64
	}{
		{
			name:              "basic trimming with alignment",
			rangeStart:        0,
			rangeEnd:          2500,
			snapshotSeqs:      []int64{0, 500, 1000, 1500, 2000, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          []int64{500, 1500, 2500},
		},
		{
			name:              "basic trimming with alignment #2",
			rangeStart:        0,
			rangeEnd:          2500,
			snapshotSeqs:      []int64{0, 500, 900, 1100, 1500, 1990, 2000, 2100, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          []int64{500, 900, 1500, 1990, 2100, 2500},
		},
		{
			name:              "basic trimming with alignment #3",
			rangeStart:        0,
			rangeEnd:          80,
			snapshotSeqs:      []int64{0, 10, 20, 30, 40, 50, 60, 70, 80},
			retentionInterval: 50,
			minKeep:           20,
			expected:          []int64{10, 20, 30, 40, 60},
		},
		{
			name:              "only one snapshot in a bucket",
			rangeStart:        500,
			rangeEnd:          2500,
			snapshotSeqs:      []int64{500, 1500, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "trimming excludes recent snapshots",
			rangeStart:        0,
			rangeEnd:          4000,
			snapshotSeqs:      []int64{0, 500, 1000, 2000, 3000, 4000},
			retentionInterval: 1000,
			minKeep:           1000,
			expected:          []int64{500},
		},
		{
			name:              "empty input",
			rangeStart:        0,
			rangeEnd:          -1,
			snapshotSeqs:      []int64{},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "no trimming needed when all aligned",
			rangeStart:        0,
			rangeEnd:          3000,
			snapshotSeqs:      []int64{0, 1000, 2000, 3000},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "mixed aligned and misaligned with minimum keep",
			rangeStart:        0,
			rangeEnd:          2700,
			snapshotSeqs:      []int64{0, 900, 1000, 1800, 2000, 2700},
			retentionInterval: 1000,
			minKeep:           500,
			expected:          []int64{900, 1800},
		},
		{
			name:              "range end beyond last snapshot trims within bucket",
			rangeStart:        1000,
			rangeEnd:          5000,
			snapshotSeqs:      []int64{1000, 1100, 1800, 1900},
			retentionInterval: 1000,
			minKeep:           1000,
			expected:          []int64{1100, 1800, 1900},
		},
		{
			name:              "ignores snapshots outside provided range",
			rangeStart:        100,
			rangeEnd:          300,
			snapshotSeqs:      []int64{50, 150, 175, 400},
			retentionInterval: 100,
			minKeep:           0,
			expected:          []int64{175},
		},
		{
			name:              "retention interval non-positive disables trimming",
			rangeStart:        0,
			rangeEnd:          100,
			snapshotSeqs:      []int64{0, 50, 100},
			retentionInterval: 0,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "nil snapshot slice returns nothing",
			rangeStart:        0,
			rangeEnd:          100,
			snapshotSeqs:      nil,
			retentionInterval: 50,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "idempotent re-run after nullification",
			rangeStart:        0,
			rangeEnd:          3000,
			snapshotSeqs:      []int64{0, 1000, 1001, 2000},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          []int64{1001},
		},
		{
			name:              "mixed empty and single snapshot buckets",
			rangeStart:        0,
			rangeEnd:          3500,
			snapshotSeqs:      []int64{500, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
	}

	for _, tt := range testTable {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			actual := DetermineStreamSnapshotsToNullify(
				tt.rangeStart,
				tt.rangeEnd,
				tt.snapshotSeqs,
				tt.retentionInterval,
				tt.minKeep,
			)
			sort.Slice(actual, func(i, j int) bool { return actual[i] < actual[j] })
			assert.Equal(t, tt.expected, actual)
		})
	}
}

func TestFindClosestSnapshotMiniblock(t *testing.T) {
	tests := []struct {
		name          string
		presentRanges []MiniblockRange
		start         int64
		expected      int64
	}{
		{
			name: "exact snapshot match",
			presentRanges: []MiniblockRange{
				{StartInclusive: 0, EndInclusive: 10, SnapshotSeqNums: []int64{3, 7, 10}},
			},
			start:    10,
			expected: 10,
		},
		{
			name: "nearest lower snapshot across ranges",
			presentRanges: []MiniblockRange{
				{StartInclusive: 0, EndInclusive: 5, SnapshotSeqNums: []int64{0, 2, 5}},
				{StartInclusive: 10, EndInclusive: 20, SnapshotSeqNums: []int64{12, 16, 20}},
			},
			start:    18,
			expected: 16,
		},
		{
			name: "start before any snapshot",
			presentRanges: []MiniblockRange{
				{StartInclusive: 5, EndInclusive: 10, SnapshotSeqNums: []int64{5, 8}},
			},
			start:    3,
			expected: 3,
		},
		{
			name: "no snapshots available",
			presentRanges: []MiniblockRange{
				{StartInclusive: 0, EndInclusive: 5},
				{StartInclusive: 10, EndInclusive: 15},
			},
			start:    12,
			expected: 12,
		},
		{
			name: "snapshots outside range are ignored",
			presentRanges: []MiniblockRange{
				{StartInclusive: 10, EndInclusive: 20, SnapshotSeqNums: []int64{25, 30}},
			},
			start:    15,
			expected: 15,
		},
		{
			name: "duplicate snapshot values",
			presentRanges: []MiniblockRange{
				{StartInclusive: 0, EndInclusive: 10, SnapshotSeqNums: []int64{1, 4, 4}},
			},
			start:    9,
			expected: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FindClosestSnapshotMiniblock(tt.presentRanges, tt.start)
			require.Equal(t, tt.expected, result)
		})
	}
}
