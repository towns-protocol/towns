package external_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage/external"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestAWSS3Storage(t *testing.T) {
	t.Parallel()

	ctx := t.Context()
	require := require.New(t)

	// Load configuration
	cfg := loadConfig(t)

	// Create S3 storage configuration
	extStorageCfg := &config.ExternalMediaStreamStorageConfig{
		AwsS3: config.ExternalMediaStreamStorageAWSS3Config{
			Bucket:          cfg.ExternalMediaStreamStorage.AwsS3.Bucket,
			Region:          cfg.ExternalMediaStreamStorage.AwsS3.Region,
			AccessKeyID:     cfg.ExternalMediaStreamStorage.AwsS3.AccessKeyID,
			SecretAccessKey: cfg.ExternalMediaStreamStorage.AwsS3.SecretAccessKey,
		},
	}

	require.False(extStorageCfg.Gcs.Enabled())
	if !extStorageCfg.AwsS3.Enabled() {
		t.Skipf("S3 is not enabled. Skipping test.")
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

	// Verify S3 storage location
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
