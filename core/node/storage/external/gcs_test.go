package external_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage/external"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestGoogleCloudStorage(t *testing.T) {
	t.Parallel()

	ctx := t.Context()
	require := require.New(t)

	// Load configuration
	cfg := loadConfig(t)

	// Create GCS storage configuration
	extStorageCfg := &config.ExternalMediaStreamStorageConfig{
		Gcs: config.ExternalMediaStreamStorageGCStorageConfig{
			Bucket:          cfg.ExternalMediaStreamStorage.Gcs.Bucket,
			JsonCredentials: cfg.ExternalMediaStreamStorage.Gcs.JsonCredentials,
		},
	}

	require.False(extStorageCfg.AwsS3.Enabled())
	if !extStorageCfg.Gcs.Enabled() {
		t.Skipf("GCS is not enabled. Skipping test.")
	}

	// Create storage instance
	streamID := testutils.FakeStreamId(STREAM_MEDIA_BIN)
	storage, err := external.NewStorage(ctx, extStorageCfg, "unittest")
	require.NoError(err)
	require.NotNil(storage)

	// Generate random miniblock data
	miniblocks, totalSize := generateRandomMiniblocks()

	// Upload miniblocks
	parts := uploadMiniblocks(t, ctx, storage, streamID, miniblocks, totalSize)

	// Verify GCS storage location
	require.Equal(len(parts), len(miniblocks))

	// Register cleanup
	registerCleanup(t, storage, streamID)

	// Validate descriptors
	validateDescriptors(t, parts, miniblocks)

	// Create test read function
	testReadMiniblocks := createTestReadFunction(ctx, storage, streamID, parts, miniblocks)

	// Get standard test cases
	tests := getStandardTestCases(len(miniblocks))

	// Run test cases
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			testReadMiniblocks(t, test.ranges)
		})
	}
}
