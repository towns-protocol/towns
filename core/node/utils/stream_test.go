package utils

import (
	"sort"
	"testing"

	"gotest.tools/assert"
)

func TestDetermineSnapshotsToNullify(t *testing.T) {
	tests := []struct {
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := DetermineStreamSnapshotsToNullify(
				tt.rangeStart,
				tt.rangeEnd,
				tt.snapshotSeqs,
				tt.retentionInterval,
				tt.minKeep,
			)
			sort.Slice(actual, func(i, j int) bool { return actual[i] < actual[j] }) // ensure consistent order
			assert.Equal(t, tt.expected, actual)
		})
	}
}
