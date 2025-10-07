package storage_test

import (
	"crypto/rand"
	"net/http"
	"testing"

	gcpstorage "cloud.google.com/go/storage"
	awshttp "github.com/aws/aws-sdk-go-v2/aws/transport/http"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/api/option"
	raw "google.golang.org/api/storage/v1"
	htransport "google.golang.org/api/transport/http"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/config/builder"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	. "github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
)

// s3DeleteMediaMiniblock deletes the given stream from S3.
func s3DeleteMediaMiniblock(
	t *testing.T,
	client *s3.Client,
	bucket string,
	node common.Address,
	streamID StreamId,
) {
	if t == nil {
		panic("s3DeleteMediaMiniblock must be used during tests")
	}

	objectKey := ExternalStorageObjectKey(node, streamID)

	_, err := client.DeleteObject(t.Context(), &s3.DeleteObjectInput{
		Bucket: &bucket,
		Key:    &objectKey,
	})
	if err != nil {
		t.Fatalf("Unable to delete S3 object %s from bucket %s: %v", objectKey, bucket, err)
	}
}

// gcpDeleteMediaMiniblock delete a media stream from GCP Storage.
func gcpDeleteMediaMiniblock(
	t *testing.T,
	bucket *gcpstorage.BucketHandle,
	node common.Address,
	streamID StreamId,
) {
	if t == nil {
		panic("gcpDeleteMediaMiniblock must be used during tests")
	}

	objectKey := ExternalStorageObjectKey(node, streamID)

	if err := bucket.Object(objectKey).Delete(t.Context()); err != nil {
		t.Fatalf("Unable to delete media miniblock from GCP: %v", err)
	}
}

// TestExternalMediaStreamStorage tests if media stream data can be written
// to external storage.
func TestExternalMediaStreamStorage(t *testing.T) {
	t.Parallel()

	// the following tests require AWS/GCP credentials
	cfg := config.GetDefaultConfig()
	bld, err := builder.NewConfigBuilder(cfg, "RIVER")
	require.NoError(t, err)

	cfg, err = bld.Build()
	require.NoError(t, err)

	t.Run("AWS S3", func(t *testing.T) {
		t.Run("(S3) Write non media stream miniblock", func(t *testing.T) {
			testS3WriteNonMediaMiniblock(t, nil, "")
		})
		t.Run("Write media stream miniblock without media stream descriptor", func(t *testing.T) {
			testS3WriteMediaMiniblockWithoutDescriptor(t, nil, "")
		})
		t.Run("Miniblock writable", func(t *testing.T) {
			testS3CanWriteMiniblock(t)
		})

		// the following tests require AWS credentials
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

	t.Run("GCP Storage", func(t *testing.T) {
		t.Run("Write non media stream miniblock", func(t *testing.T) {
			testGCPWriteNonMediaMiniblock(t, nil)
		})
		t.Run("Write media stream miniblock without media stream descriptor", func(t *testing.T) {
			testGCPWriteMediaMiniblockWithoutDescriptor(t, nil, nil)
		})

		gcpCfg := cfg.ExternalMediaStreamStorage.Gcp
		if !gcpCfg.Enabled() {
			t.Skipf("GCP Storage integration tests disabled - missing configuration")
		}

		ctx := t.Context()

		// setup custom transport to disable keep-alive and max-idle connections
		// to make goleak happy.
		base := http.DefaultTransport.(*http.Transport).Clone()
		base.DisableKeepAlives = true
		base.MaxIdleConns = -1
		defer http.DefaultTransport.(*http.Transport).CloseIdleConnections()
		defer base.CloseIdleConnections()

		trans, err := htransport.NewTransport(ctx, base,
			option.WithCredentialsJSON([]byte(cfg.ExternalMediaStreamStorage.Gcp.JsonCredentials)),
			option.WithScopes(raw.DevstorageReadWriteScope))
		require.NoError(t, err)

		c := http.Client{Transport: trans}
		defer c.CloseIdleConnections()

		client, err := gcpstorage.NewClient(ctx, option.WithHTTPClient(&c))
		require.NoError(t, err)
		defer client.Close()

		bucket := client.Bucket(cfg.ExternalMediaStreamStorage.Gcp.Bucket)

		t.Run("Write media stream miniblock in single PUT", func(t *testing.T) {
			testGCPWriteMediaMiniblock(t, bucket)
		})
		t.Run("Write media stream miniblock in multipart upload", func(t *testing.T) {
			testGCPwriteMultiPartMediaMiniblock(t, bucket, 3)
		})
		t.Run("Write media stream miniblock in large multipart upload", func(t *testing.T) {
			testGCPwriteMultiPartMediaMiniblock(t, bucket, 35)
		})
	})
}

func testGCPWriteNonMediaMiniblock(t *testing.T, bucket *gcpstorage.BucketHandle) {
	var (
		ctx     = t.Context()
		require = require.New(t)
	)

	_, err := GCPWriteMediaMiniblock(
		ctx,
		bucket,
		common.Address{},
		testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN),
		nil,
		nil,
	)
	require.True(IsRiverErrorCode(err, Err_BAD_STREAM_ID))
}

func testGCPWriteMediaMiniblockWithoutDescriptor(
	t *testing.T,
	client *gcpstorage.Client,
	bucket *gcpstorage.BucketHandle,
) {
	var (
		ctx     = t.Context()
		require = require.New(t)
	)

	mb := MiniblockDescriptor{}
	_, err := GCPWriteMediaMiniblock(ctx, bucket, common.Address{}, testutils.FakeStreamId(STREAM_MEDIA_BIN), nil, &mb)
	require.True(IsRiverErrorCode(err, Err_BAD_BLOCK))
}

func testGCPWriteMediaMiniblock(t *testing.T, bucket *gcpstorage.BucketHandle) {
	var (
		ctx       = t.Context()
		require   = require.New(t)
		chunkSize = uint64(GCPMinimumUploadSize)
		streamMD  *MediaStreamExternalDataDescriptor
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

	streamMD, err := GCPWriteMediaMiniblock(ctx, bucket, common.Address{}, streamID, streamMD, miniblock)
	require.NoError(err)
	require.NotNil(streamMD)
	require.Empty(streamMD.S3MultiPartUploadID)
	require.EqualValues(1, len(streamMD.Parts))
	require.EqualValues(1, streamMD.ChunkCount)

	readMiniblocks, err := GCPReadMediaMiniblocks(ctx, bucket, streamID, common.Address{}, streamMD)
	require.NoError(err)
	require.Equal(1, len(readMiniblocks))
	require.EqualValues(*miniblock, *readMiniblocks[0])

	gcpDeleteMediaMiniblock(t, bucket, common.Address{}, streamID)
}

func testGCPwriteMultiPartMediaMiniblock(t *testing.T, bucket *gcpstorage.BucketHandle, count int) {
	var (
		ctx                   = t.Context()
		totalOffAllChunksSize = 512 * 1024
		chunkSize             = totalOffAllChunksSize / count
		streamMD              *MediaStreamExternalDataDescriptor
		streamID              = testutils.FakeStreamId(STREAM_MEDIA_BIN)
		err                   error
		miniblocks            []*MiniblockDescriptor
	)

	for i := range count {
		miniblocks = append(miniblocks, &MiniblockDescriptor{
			Number: int64(i + 1),
			Data:   generateRandomBytes(t, uint64(chunkSize)),
			MediaStream: &MediaStreamMiniblockDescriptor{
				ChunkIndex: int32(i),
				ChunkCount: int32(count),
				ChunkSize:  uint64(chunkSize),
			},
		})
	}

	for i, mb := range miniblocks {
		streamMD, err = GCPWriteMediaMiniblock(ctx, bucket, common.Address{}, streamID, streamMD, mb)
		require.NoError(t, err)
		require.NotNil(t, streamMD)
		require.Equal(t, "gcp", streamMD.ExternalBackend)
		require.EqualValues(t, i+1, len(streamMD.Parts))
		require.EqualValues(t, len(miniblocks), streamMD.ChunkCount)
	}

	// ensure that miniblocks can be read
	readMiniblocks, err := GCPReadMediaMiniblocks(ctx, bucket, streamID, common.Address{}, streamMD)
	require.NoError(t, err)
	require.EqualValues(t, len(miniblocks), len(readMiniblocks))
	for i, miniblock := range miniblocks {
		require.EqualValues(t, *miniblock, *readMiniblocks[i])
	}

	gcpDeleteMediaMiniblock(t, bucket, common.Address{}, streamID)
}

func testS3WriteNonMediaMiniblock(t *testing.T, client *s3.Client, bucket string) {
	var (
		ctx     = t.Context()
		require = require.New(t)
	)

	_, err := S3WriteMediaMiniblock(
		ctx,
		client,
		bucket,
		common.Address{},
		testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN),
		nil,
		nil,
	)
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
	_, err := S3WriteMediaMiniblock(
		ctx,
		client,
		bucket,
		common.Address{},
		testutils.FakeStreamId(STREAM_MEDIA_BIN),
		nil,
		&mb,
	)
	require.True(IsRiverErrorCode(err, Err_BAD_BLOCK))
}

func testS3writeMediaMiniblock(t *testing.T, client *s3.Client, bucket string) {
	var (
		ctx       = t.Context()
		require   = require.New(t)
		chunkSize = uint64(S3MinimumUploadSize)
		streamMD  *MediaStreamExternalDataDescriptor
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
	require.Equal("s3", streamMD.ExternalBackend)
	require.Empty(streamMD.S3MultiPartUploadID)
	require.EqualValues(1, len(streamMD.Parts))
	require.EqualValues(1, streamMD.ChunkCount)

	readMiniblocks, err := S3ReadMediaMiniblocks(ctx, client, bucket, streamID, common.Address{}, streamMD)
	require.NoError(err)
	require.Equal(1, len(readMiniblocks))
	require.EqualValues(*miniblock, *readMiniblocks[0])

	s3DeleteMediaMiniblock(t, client, bucket, common.Address{}, streamID)
}

func testS3writeMultiPartMediaMiniblock(t *testing.T, client *s3.Client, bucket string) {
	var (
		ctx       = t.Context()
		chunkSize = S3MultiPartMinimumPartSize
		streamMD  *MediaStreamExternalDataDescriptor
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
		require.NotEmpty(t, streamMD.S3MultiPartUploadID)
		require.EqualValues(t, i+1, len(streamMD.Parts))
		require.EqualValues(t, len(miniblocks), streamMD.ChunkCount)
	}

	// ensure that miniblocks can be read
	readMiniblocks, err := S3ReadMediaMiniblocks(ctx, client, bucket, streamID, common.Address{}, streamMD)
	require.NoError(t, err)
	require.EqualValues(t, len(miniblocks), len(readMiniblocks))
	require.EqualValues(t, *miniblocks[0], *readMiniblocks[0])
	require.EqualValues(t, *miniblocks[1], *readMiniblocks[1])
	require.EqualValues(t, *miniblocks[2], *readMiniblocks[2])

	s3DeleteMediaMiniblock(t, client, bucket, common.Address{}, streamID)
}

func generateRandomBytes(t *testing.T, size uint64) []byte {
	b := make([]byte, size)
	_, err := rand.Read(b)
	require.NoError(t, err)
	return b
}
