package storage_test

import (
	"crypto/rand"
	"net/http"
	"testing"

	awshttp "github.com/aws/aws-sdk-go-v2/aws/transport/http"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/stretchr/testify/require"
	"github.com/towns-protocol/towns/core/config"
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
		testS3WriteNonMediaMiniblock(t, nil, nil)
	})
	t.Run("Write media stream miniblock without media stream descriptor", func(t *testing.T) {
		testS3WriteMediaMiniblockWithoutDescriptor(t, nil, nil)
	})
	t.Run("Miniblock writable to S3 upload", func(t *testing.T) {
		testS3CanWriteMiniblock(t)
	})

	t.Run("AWS", func(t *testing.T) {
		// The following tests require S3 credentials to be set in the environment
		s3cfg := config.S3TestAWSConfigFromEnv()
		if s3cfg == nil {
			t.Skip("Missing S3 credentials - skipping AWS S3 integration tests.")
		}

		ctx := t.Context()
		require := require.New(t)

		cfg, err := awsconfig.LoadDefaultConfig(ctx,
			awsconfig.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(s3cfg.AccessKeyID, s3cfg.SecretAccessKey, "")),
			awsconfig.WithRegion(s3cfg.Region),
			awsconfig.WithHTTPClient(awshttp.NewBuildableClient().WithTransportOptions(func(transport *http.Transport) {
				transport.DisableKeepAlives = true // http connections remain open and goleak detects leaks
			})))

		require.NoError(err, "Failed to load AWS S3 config")

		client := s3.NewFromConfig(cfg)

		t.Run("Write media stream miniblock in single PUT", func(t *testing.T) {
			testS3writeMediaMiniblock(t, client, &s3cfg.Bucket)
		})
		t.Run("Write media stream miniblock in multipart upload", func(t *testing.T) {
			testS3writeMultiPartMediaMiniblock(t, client, &s3cfg.Bucket)
		})
	})

	t.Run("GCP", func(t *testing.T) {
		// The following tests require S3 credentials to be set in the environment
		s3cfg := config.S3TestGCPConfigFromEnv()
		if s3cfg == nil {
			t.Skip("Missing S3 credentials - skipping GCP S3 integration tests.")
		}

		ctx := t.Context()
		require := require.New(t)

		cfg, err := awsconfig.LoadDefaultConfig(ctx,
			awsconfig.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(s3cfg.AccessKeyID, s3cfg.SecretAccessKey, "")),
			awsconfig.WithRegion(s3cfg.Region),
			awsconfig.WithHTTPClient(awshttp.NewBuildableClient().WithTransportOptions(func(transport *http.Transport) {
				transport.DisableKeepAlives = true // http connections remain open and goleak detects leaks
			})))

		require.NoError(err, "Failed to load GCP S3 config")

		client := s3.NewFromConfig(cfg)

		t.Run("Write media stream miniblock in single PUT", func(t *testing.T) {
			testS3writeMediaMiniblock(t, client, &s3cfg.Bucket)
		})
		t.Run("Write media stream miniblock in multipart upload", func(t *testing.T) {
			testS3writeMultiPartMediaMiniblock(t, client, &s3cfg.Bucket)
		})
	})
}

func testS3WriteNonMediaMiniblock(t *testing.T, client *s3.Client, bucket *string) {
	var (
		ctx     = t.Context()
		require = require.New(t)
	)

	_, err := S3WriteMediaMiniblock(ctx, client, bucket, "1_", testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN), nil, nil)
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

func testS3WriteMediaMiniblockWithoutDescriptor(t *testing.T, client *s3.Client, bucket *string) {
	var (
		ctx     = t.Context()
		require = require.New(t)
	)

	mb := MiniblockDescriptor{}
	_, err := S3WriteMediaMiniblock(ctx, client, bucket, "1_", testutils.FakeStreamId(STREAM_MEDIA_BIN), nil, &mb)
	require.True(IsRiverErrorCode(err, Err_BAD_BLOCK))
}

func testS3writeMediaMiniblock(t *testing.T, client *s3.Client, bucket *string) {
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

	streamMD, err := S3WriteMediaMiniblock(ctx, client, bucket, "", streamID, streamMD, miniblock)
	require.NoError(err)
	require.NotNil(streamMD)
	require.Nil(streamMD.S3MultiPartUploadID)
	require.EqualValues(1, len(streamMD.S3Parts))
	require.EqualValues(1, streamMD.S3PartsCount)

	readMiniblocks, err := S3ReadMediaMiniblocks(ctx, client, bucket, streamID, "", streamMD)
	require.NoError(err)
	require.Equal(1, len(readMiniblocks))
	require.EqualValues(*miniblock, *readMiniblocks[0])

	S3DeleteMediaMiniblock(t, client, bucket, "", streamID)
}

func testS3writeMultiPartMediaMiniblock(t *testing.T, client *s3.Client, bucket *string) {
	var (
		ctx       = t.Context()
		chunkSize = S3MultiPartMinimumPartSize
		streamMD  *StreamMetaData
		streamID  = testutils.FakeStreamId(STREAM_MEDIA_BIN)
		err       error
	)

	miniblocks := []*MiniblockDescriptor{
		{
			Number:      int64(1),
			Data:        generateRandomBytes(t, uint64(chunkSize)),
			MediaStream: &MediaStreamMiniblockDescriptor{ChunkIndex: int32(0), ChunkCount: 3, ChunkSize: uint64(chunkSize)},
		},
		{
			Number:      int64(2),
			Data:        generateRandomBytes(t, uint64(chunkSize)),
			MediaStream: &MediaStreamMiniblockDescriptor{ChunkIndex: int32(1), ChunkCount: 3, ChunkSize: uint64(chunkSize)},
		},
		{
			Number:      int64(3),
			Data:        generateRandomBytes(t, 373),
			MediaStream: &MediaStreamMiniblockDescriptor{ChunkIndex: int32(2), ChunkCount: 3, ChunkSize: uint64(chunkSize)},
		},
	}

	for i, mb := range miniblocks {
		streamMD, err = S3WriteMediaMiniblock(ctx, client, bucket, "", streamID, streamMD, mb)
		require.NoError(t, err)
		require.NotNil(t, streamMD)
		require.NotNil(t, streamMD.S3MultiPartUploadID)
		require.EqualValues(t, i+1, len(streamMD.S3Parts))
		require.EqualValues(t, len(miniblocks), streamMD.S3PartsCount)
	}

	// ensure that miniblocks can be read
	readMiniblocks, err := S3ReadMediaMiniblocks(ctx, client, bucket, streamID, "", streamMD)
	require.NoError(t, err)
	require.EqualValues(t, len(miniblocks), len(readMiniblocks))
	require.EqualValues(t, *miniblocks[0], *readMiniblocks[0])
	require.EqualValues(t, *miniblocks[1], *readMiniblocks[1])
	require.EqualValues(t, *miniblocks[2], *readMiniblocks[2])

	S3DeleteMediaMiniblock(t, client, bucket, "", streamID)
}

func generateRandomBytes(t *testing.T, size uint64) []byte {
	b := make([]byte, size)
	_, err := rand.Read(b)
	require.NoError(t, err)
	return b
}
