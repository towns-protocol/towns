package storage

import (
	"sort"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDetermineSnapshotsToNullify(t *testing.T) {
	tests := []struct {
		name              string
		snapshotSeqs      []int64
		retentionInterval int64
		minKeep           int64
		expected          []int64
	}{
		{
			name:              "basic trimming with alignment",
			snapshotSeqs:      []int64{0, 500, 1000, 1500, 2000, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          []int64{0, 1000, 2000},
		},
		{
			name:              "basic trimming with alignment #2",
			snapshotSeqs:      []int64{0, 500, 900, 1100, 1500, 1990, 2000, 2100, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          []int64{0, 500, 1100, 1500, 2000, 2100},
		},
		{
			name:              "basic trimming with alignment #3",
			snapshotSeqs:      []int64{0, 10, 20, 30, 40, 50, 60, 70, 80},
			retentionInterval: 50,
			minKeep:           20,
			expected:          []int64{0, 10, 20, 30, 50},
		},
		{
			name:              "only one snapshot in a bucket",
			snapshotSeqs:      []int64{500, 1500, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "trimming excludes recent snapshots",
			snapshotSeqs:      []int64{0, 500, 1000, 2000, 3000, 4000},
			retentionInterval: 1000,
			minKeep:           1000,
			expected:          []int64{0},
		},
		{
			name:              "empty input",
			snapshotSeqs:      []int64{},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "no trimming needed when all aligned",
			snapshotSeqs:      []int64{0, 1000, 2000, 3000},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "mixed aligned and misaligned with minimum keep",
			snapshotSeqs:      []int64{0, 900, 1000, 1800, 2000, 2700},
			retentionInterval: 1000,
			minKeep:           500,
			expected:          []int64{0, 1000},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := determineSnapshotsToNullify(tt.snapshotSeqs, tt.retentionInterval, tt.minKeep)
			sort.Slice(actual, func(i, j int) bool { return actual[i] < actual[j] }) // ensure consistent order
			assert.Equal(t, tt.expected, actual)
		})
	}
}
