package storage_test

import (
	"crypto/rand"
	"net/http"
	"testing"

	awshttp "github.com/aws/aws-sdk-go-v2/aws/transport/http"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/config/builder"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	. "github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestS3Integration(t *testing.T) {
	t.Parallel()

	// These tests can always be run locally
	t.Run("Write non media stream miniblock", func(t *testing.T) {
		testS3WriteNonMediaMiniblock(t, nil, "")
	})
	t.Run("Write media stream miniblock without media stream descriptor", func(t *testing.T) {
		testS3WriteMediaMiniblockWithoutDescriptor(t, nil, "")
	})
	t.Run("Miniblock writable to S3 upload", func(t *testing.T) {
		testS3CanWriteMiniblock(t)
	})

	cfg := config.GetDefaultConfig()
	bld, err := builder.NewConfigBuilder(cfg, "RIVER")
	require.NoError(t, err)

	cfg, err = bld.Build()
	require.NoError(t, err)

	t.Run("AWS", func(t *testing.T) {
		if !cfg.ExternalMediaStreamStorage.AwsS3.Enabled() {
			t.Skipf("AWS S3 integration tests disabled - missing configuration")
		}

		ctx := t.Context()
		awsS3 := cfg.ExternalMediaStreamStorage.AwsS3
		cfg, err := awsconfig.LoadDefaultConfig(ctx,
			awsconfig.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(awsS3.AccessKeyID, awsS3.SecretAccessKey, "")),
			awsconfig.WithRegion(awsS3.Region),
			awsconfig.WithHTTPClient(awshttp.NewBuildableClient().WithTransportOptions(func(transport *http.Transport) {
				transport.DisableKeepAlives = true // http connections remain open and goleak detects leaks
			})))

		require.NoError(t, err, "Failed to load AWS S3 config")

		client := s3.NewFromConfig(cfg)

		t.Run("Write media stream miniblock in single PUT", func(t *testing.T) {
			testS3writeMediaMiniblock(t, client, awsS3.Bucket)
		})
		t.Run("Write media stream miniblock in multipart upload", func(t *testing.T) {
			testS3writeMultiPartMediaMiniblock(t, client, awsS3.Bucket)
		})
	})

	t.Run("GCP", func(t *testing.T) {
		t.Skip("GCP not implemented")
	})
}

func testS3WriteNonMediaMiniblock(t *testing.T, client *s3.Client, bucket string) {
	var (
		ctx     = t.Context()
		require = require.New(t)
	)

	_, err := S3WriteMediaMiniblock(ctx, client, bucket, common.Address{}, testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN), nil, nil)
	require.True(IsRiverErrorCode(err, Err_BAD_STREAM_ID))
}

func testS3CanWriteMiniblock(t *testing.T) {
	require := require.New(t)

	tests := []struct {
		description string
		streamID    StreamId
		miniblock   *MiniblockDescriptor
		verify      func(result bool, err error, msgAndArgs ...interface{})
	}{
		{
			description: "can write miniblock",
			streamID:    testutils.FakeStreamId(STREAM_MEDIA_BIN),
			miniblock: &MiniblockDescriptor{
				Number: 1,
				Data:   generateRandomBytes(t, S3MinimumUploadSize),
				MediaStream: &MediaStreamMiniblockDescriptor{
					ChunkIndex: 0,
					ChunkCount: 1,
					ChunkSize:  S3MultiPartMinimumPartSize,
				},
			},
			verify: func(result bool, err error, msgAndArgs ...interface{}) {
				require.True(result, msgAndArgs...)
				require.NoError(err, msgAndArgs...)
			},
		},
		{
			description: "too small chunk size",
			streamID:    testutils.FakeStreamId(STREAM_MEDIA_BIN),
			miniblock: &MiniblockDescriptor{
				Number: 1,
				Data:   generateRandomBytes(t, 100),
				MediaStream: &MediaStreamMiniblockDescriptor{
					ChunkIndex: 0,
					ChunkCount: 1,
					ChunkSize:  100,
				},
			},
			verify: func(result bool, err error, msgAndArgs ...interface{}) {
				require.False(result, msgAndArgs...)
				require.NoError(err, msgAndArgs...)
			},
		},
		{
			description: "genesis media stream block",
			streamID:    testutils.FakeStreamId(STREAM_MEDIA_BIN),
			miniblock: &MiniblockDescriptor{
				Number: 0,
				Data:   generateRandomBytes(t, 25),
				MediaStream: &MediaStreamMiniblockDescriptor{
					ChunkIndex: 0,
					ChunkCount: 1,
					ChunkSize:  25,
				},
			},
			verify: func(result bool, err error, msgAndArgs ...interface{}) {
				require.False(result, msgAndArgs...)
				require.NoError(err, msgAndArgs...)
			},
		},
		{
			description: "missing chunk count",
			streamID:    testutils.FakeStreamId(STREAM_MEDIA_BIN),
			miniblock: &MiniblockDescriptor{
				Number: 0,
				Data:   generateRandomBytes(t, 25),
				MediaStream: &MediaStreamMiniblockDescriptor{
					ChunkIndex: 0,
					ChunkCount: 0,
					ChunkSize:  25,
				},
			},
			verify: func(result bool, err error, msgAndArgs ...interface{}) {
				require.False(result, msgAndArgs...)
				require.NoError(err, msgAndArgs...)
			},
		},
		{
			description: "incorrect chunk index",
			streamID:    testutils.FakeStreamId(STREAM_MEDIA_BIN),
			miniblock: &MiniblockDescriptor{
				Number: 1,
				Data:   generateRandomBytes(t, 25),
				MediaStream: &MediaStreamMiniblockDescriptor{
					ChunkIndex: 1,
					ChunkCount: 1,
					ChunkSize:  25,
				},
			},
			verify: func(result bool, err error, msgAndArgs ...interface{}) {
				require.False(result, msgAndArgs...)
				require.Error(err, msgAndArgs...)
			},
		},
		{
			description: "single put operation",
			streamID:    testutils.FakeStreamId(STREAM_MEDIA_BIN),
			miniblock: &MiniblockDescriptor{
				Number: 1,
				Data:   generateRandomBytes(t, S3MultiPartMinimumPartSize+1),
				MediaStream: &MediaStreamMiniblockDescriptor{
					ChunkIndex: 0,
					ChunkCount: 1,
					ChunkSize:  S3MultiPartMinimumPartSize + 1,
				},
			},
			verify: func(result bool, err error, msgAndArgs ...interface{}) {
				require.True(result, msgAndArgs...)
				require.NoError(err, msgAndArgs...)
			},
		},
	}

	for _, test := range tests {
		t.Run(test.description, func(t *testing.T) {
			result, err := S3CanWriteMiniblock(test.streamID, test.miniblock)
			test.verify(result, err)
		})
	}
}

func testS3WriteMediaMiniblockWithoutDescriptor(t *testing.T, client *s3.Client, bucket string) {
	var (
		ctx     = t.Context()
		require = require.New(t)
	)

	mb := MiniblockDescriptor{}
	_, err := S3WriteMediaMiniblock(ctx, client, bucket, common.Address{}, testutils.FakeStreamId(STREAM_MEDIA_BIN), nil, &mb)
	require.True(IsRiverErrorCode(err, Err_BAD_BLOCK))
}

func testS3writeMediaMiniblock(t *testing.T, client *s3.Client, bucket string) {
	var (
		ctx       = t.Context()
		require   = require.New(t)
		chunkSize = uint64(S3MinimumUploadSize)
		streamMD  *StreamMetaData
		streamID  = testutils.FakeStreamId(STREAM_MEDIA_BIN)
		miniblock = &MiniblockDescriptor{
			Number: 1,
			Data:   generateRandomBytes(t, chunkSize),
			MediaStream: &MediaStreamMiniblockDescriptor{
				ChunkIndex: 0,
				ChunkCount: 1,
				ChunkSize:  chunkSize,
			},
		}
	)

	streamMD, err := S3WriteMediaMiniblock(ctx, client, bucket, common.Address{}, streamID, streamMD, miniblock)
	require.NoError(err)
	require.NotNil(streamMD)
	require.Nil(streamMD.S3MultiPartUploadID)
	require.EqualValues(1, len(streamMD.S3Parts))
	require.EqualValues(1, streamMD.S3PartsCount)

	readMiniblocks, err := S3ReadMediaMiniblocks(ctx, client, bucket, streamID, common.Address{}, streamMD)
	require.NoError(err)
	require.Equal(1, len(readMiniblocks))
	require.EqualValues(*miniblock, *readMiniblocks[0])

	S3DeleteMediaMiniblock(t, client, bucket, common.Address{}, streamID)
}

func testS3writeMultiPartMediaMiniblock(t *testing.T, client *s3.Client, bucket string) {
	var (
		ctx       = t.Context()
		chunkSize = S3MultiPartMinimumPartSize
		streamMD  *StreamMetaData
		streamID  = testutils.FakeStreamId(STREAM_MEDIA_BIN)
		err       error
	)

	miniblocks := []*MiniblockDescriptor{
		{
			Number: int64(1),
			Data:   generateRandomBytes(t, uint64(chunkSize)),
			MediaStream: &MediaStreamMiniblockDescriptor{
				ChunkIndex: int32(0),
				ChunkCount: 3,
				ChunkSize:  uint64(chunkSize),
			},
		},
		{
			Number: int64(2),
			Data:   generateRandomBytes(t, uint64(chunkSize)),
			MediaStream: &MediaStreamMiniblockDescriptor{
				ChunkIndex: int32(1),
				ChunkCount: 3,
				ChunkSize:  uint64(chunkSize),
			},
		},
		{
			Number: int64(3),
			Data:   generateRandomBytes(t, 373),
			MediaStream: &MediaStreamMiniblockDescriptor{
				ChunkIndex: int32(2),
				ChunkCount: 3,
				ChunkSize:  uint64(chunkSize),
			},
		},
	}

	for i, mb := range miniblocks {
		streamMD, err = S3WriteMediaMiniblock(ctx, client, bucket, common.Address{}, streamID, streamMD, mb)
		require.NoError(t, err)
		require.NotNil(t, streamMD)
		require.NotNil(t, streamMD.S3MultiPartUploadID)
		require.EqualValues(t, i+1, len(streamMD.S3Parts))
		require.EqualValues(t, len(miniblocks), streamMD.S3PartsCount)
	}

	// ensure that miniblocks can be read
	readMiniblocks, err := S3ReadMediaMiniblocks(ctx, client, bucket, streamID, common.Address{}, streamMD)
	require.NoError(t, err)
	require.EqualValues(t, len(miniblocks), len(readMiniblocks))
	require.EqualValues(t, *miniblocks[0], *readMiniblocks[0])
	require.EqualValues(t, *miniblocks[1], *readMiniblocks[1])
	require.EqualValues(t, *miniblocks[2], *readMiniblocks[2])

	S3DeleteMediaMiniblock(t, client, bucket, common.Address{}, streamID)
}

func generateRandomBytes(t *testing.T, size uint64) []byte {
	b := make([]byte, size)
	_, err := rand.Read(b)
	require.NoError(t, err)
	return b
}
