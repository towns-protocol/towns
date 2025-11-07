package external_test

import (
	"context"
	crand "crypto/rand"
	"math/rand"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/config/builder"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage/external"
)

// generateRandomMiniblocks creates N random miniblocks with random data
func generateRandomMiniblocks() (map[int64][]byte, uint64) {
	N := 10 + rand.Intn(10)
	miniblocks := make(map[int64][]byte)
	totalSize := uint64(0)

	for i := 0; i < N; i++ {
		data := make([]byte, 1+(rand.Int()%10))
		_, _ = crand.Read(data)
		miniblocks[int64(i)] = data
		totalSize += uint64(len(data))
	}

	return miniblocks, totalSize
}

// loadConfig loads and builds the configuration for testing
func loadConfig(t *testing.T) *config.Config {
	cfg := config.GetDefaultConfig()
	bld, err := builder.NewConfigBuilder(cfg, "RIVER")
	require.NoError(t, err)

	cfg, err = bld.Build()
	require.NoError(t, err)

	return cfg
}

// uploadMiniblocks uploads miniblocks to storage and returns the parts
func uploadMiniblocks(
	t *testing.T,
	ctx context.Context,
	storage external.Storage,
	streamID StreamId,
	miniblocks map[int64][]byte,
	totalSize uint64,
) []external.MiniblockDescriptor {
	require := require.New(t)

	uploadSession, err := storage.StartUploadSession(ctx, streamID, totalSize)
	require.NoError(err)
	defer uploadSession.Abort(ctx)

	for i := int64(0); i < int64(len(miniblocks)); i++ {
		require.NoError(uploadSession.WriteMiniblockData(ctx, i, miniblocks[i]))
	}

	parts, _, err := uploadSession.Finish(ctx)
	require.NoError(err)

	return parts
}

// validateDescriptors validates that miniblock descriptors match expected values
func validateDescriptors(
	t *testing.T,
	parts []external.MiniblockDescriptor,
	miniblocks map[int64][]byte,
) {
	require := require.New(t)
	require.Equal(len(miniblocks), len(parts))

	start := uint64(0)
	for i, part := range parts {
		blockNum := int64(i)
		require.Equal(blockNum, part.Number)
		require.Equal(uint64(len(miniblocks[blockNum])), part.MiniblockDataLength)
		require.Equal(start, part.StartByte)
		start += part.MiniblockDataLength
	}
}

// registerCleanup registers cleanup function to delete the uploaded object
func registerCleanup(t *testing.T, storage external.Storage, streamID StreamId) {
	t.Cleanup(func() {
		if tstorage, ok := storage.(external.TestStorage); ok {
			if err := tstorage.DeleteObject(context.Background(), streamID); err != nil {
				t.Logf("Failed to delete object: %v", err)
			}
		}
	})
}

// createTestReadFunction creates a test function for reading and validating miniblocks
func createTestReadFunction(
	ctx context.Context,
	storage external.Storage,
	streamID StreamId,
	parts []external.MiniblockDescriptor,
	miniblocks map[int64][]byte,
) func(*testing.T, []external.MiniblockRange) {
	return func(t *testing.T, ranges []external.MiniblockRange) {
		require := require.New(t)

		fetchedMiniblockData, err := storage.DownloadMiniblockData(ctx, streamID, parts, ranges)
		require.NoError(err)

		// Count unique miniblock numbers (handles overlapping ranges)
		uniqueMbNums := make(map[int64]struct{})
		for _, r := range ranges {
			for i := r.FromInclusive; i < r.ToExclusive; i++ {
				uniqueMbNums[i] = struct{}{}
			}
		}

		expectedCount := int64(len(uniqueMbNums))
		require.Equal(expectedCount, int64(len(fetchedMiniblockData)))

		// Verify all requested miniblocks
		for _, r := range ranges {
			for i := r.FromInclusive; i < r.ToExclusive; i++ {
				require.Equal(miniblocks[i], fetchedMiniblockData[i])
			}
		}
	}
}

// getStandardTestCases returns standard test cases for miniblock range testing
func getStandardTestCases(numMiniblocks int) []struct {
	name   string
	ranges []external.MiniblockRange
} {
	tests := []struct {
		name   string
		ranges []external.MiniblockRange
	}{
		{
			"read all miniblocks",
			[]external.MiniblockRange{{FromInclusive: 0, ToExclusive: int64(numMiniblocks)}},
		},
		{
			"read first 3 miniblocks",
			[]external.MiniblockRange{{FromInclusive: 0, ToExclusive: 3}},
		},
		{
			"read middle 3 miniblocks",
			[]external.MiniblockRange{{FromInclusive: 3, ToExclusive: 6}},
		},
		{
			"read last 3 miniblocks",
			[]external.MiniblockRange{{FromInclusive: int64(numMiniblocks - 3), ToExclusive: int64(numMiniblocks)}},
		},
	}

	// Only add multi-range test if we have enough miniblocks
	if numMiniblocks >= 9 {
		tests = append(tests, struct {
			name   string
			ranges []external.MiniblockRange
		}{
			"read multiple ranges",
			[]external.MiniblockRange{
				{FromInclusive: 0, ToExclusive: 3},
				{FromInclusive: 2, ToExclusive: 5},
				{FromInclusive: 3, ToExclusive: 9},
			},
		})
	}

	return tests
}
