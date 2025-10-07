package storage

import (
	"bytes"
	"context"
	"io"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	// S3MultiPartMinimumPartSize defines the minimum part size for S3 multipart uploads.
	// Currently, it's 5 MiB as described in https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
	S3MultiPartMinimumPartSize = 5 * 1024 * 1024
	// S3MinimumUploadSize defines the minimum size of a media stream chunk before it's stored in S3.
	// Chunks smaller than S3MinimumUploadSize are stored in the DB.
	S3MinimumUploadSize = 100 * 1024
)

// streamIDToS3ObjectKey helper function that derives an S3 object key from the given stream ID.
// objectKeyPrefix must be empty for production use. For test code it allows for multiple service
// instances to share the same S3 bucket to upload data using their unique prefix.
func streamIDToS3ObjectKey(streamID StreamId, objectKeyPrefix string) string {
	if objectKeyPrefix == "" {
		return strings.ToLower(streamID.String())
	}

	return objectKeyPrefix + strings.ToLower(streamID.String())
}

// S3CanWriteMiniblock returns an indication if the given miniblock can be written to S3.
func S3CanWriteMiniblock(
	streamID StreamId,
	miniblock *MiniblockDescriptor,
) (canUpload bool, err error) {
	isMediaStreamMiniblock := miniblock.MediaStream != nil
	isGenesis := miniblock.Number == 0

	// only media stream non-genesis miniblocks that include a chunk can be upload to S3
	if !isMediaStreamMiniblock || isGenesis || miniblock.MediaStream.ChunkCount == 0 {
		return false, nil
	}

	if miniblock.MediaStream.ChunkIndex >= miniblock.MediaStream.ChunkCount {
		return false, RiverError(Err_BAD_BLOCK, "Media miniblock chunk index out of range").
			Tag("stream", streamID).
			Func("S3CanWriteMiniblock")
	}

	// check if it meets s3 requirements and is at least S3MinimumUploadSize big
	if useSinglePutOp := miniblock.MediaStream.ChunkCount == 1; useSinglePutOp {
		return len(miniblock.Data) >= S3MinimumUploadSize, nil
	}

	if miniblock.MediaStream.ChunkSize <= 0 {
		// backwards compatability, a client didn't provide required information to store miniblocks in S3.
		return false, nil
	}

	// the last chunk can have a different size than the given chunk_size.
	if isFinalChunk := (miniblock.MediaStream.ChunkIndex + 1) == miniblock.MediaStream.ChunkCount; isFinalChunk {
		return miniblock.MediaStream.ChunkSize < (2 * S3MultiPartMinimumPartSize), nil
	}

	// all other chunks must be at least the provided chunk_size
	if uint64(len(miniblock.Data)) >= miniblock.MediaStream.ChunkSize &&
		uint64(len(miniblock.Data)) < uint64(2*S3MultiPartMinimumPartSize) {
		return true, nil
	}

	return false, RiverError(
		Err_BAD_BLOCK, "Media miniblock data size does not match chunk size",
		"stream", streamID,
		"chunkSize", miniblock.MediaStream.ChunkSize,
		"blockData", len(miniblock.Data),
		"miniblock", miniblock.Number).
		Func("mustStoreEphemeralMiniblockInS3")
}

// S3DeleteMediaMiniblock deletes the given miniblock from S3.
// It's intended use if for tests and therefore accepts t.
func S3DeleteMediaMiniblock(
	t *testing.T,
	client *s3.Client,
	bucket *string,
	objectKeyPrefix string,
	streamID StreamId,
) {
	if t == nil {
		panic("S3DeleteMediaMiniblock must be used during tests")
	}

	objectKey := streamIDToS3ObjectKey(streamID, objectKeyPrefix)

	_, err := client.DeleteObject(t.Context(), &s3.DeleteObjectInput{
		Bucket: bucket,
		Key:    &objectKey,
	})
	if err != nil {
		t.Fatalf("Unable to delete S3 object %s from bucket %s: %v", objectKey, *bucket, err)
	}
}

// S3WriteMediaMiniblock writes the given miniblock to S3 and returns metadata that includes
// details of the upload that can later be used to read the miniblock.
// objectKeyPrefix is optional and typically only used in tests to allow multiple service instances
// to share the same s3 bucket.
func S3WriteMediaMiniblock(
	ctx context.Context,
	client *s3.Client,
	bucket *string,
	objectKeyPrefix string,
	streamID StreamId,
	streamMD *StreamMetaData,
	miniblock *MiniblockDescriptor,
) (*StreamMetaData, error) {
	if streamID.Type() != STREAM_MEDIA_BIN {
		return nil, RiverError(Err_BAD_STREAM_ID, "Invalid stream type").
			Tag("stream", streamID).
			Func("S3WriteMediaMiniblock")
	}

	if miniblock.MediaStream == nil {
		return nil, RiverError(Err_BAD_BLOCK, "Only media miniblock with descriptor can be stored in S3").
			Tag("stream", streamID).
			Func("S3WriteMediaMiniblock")
	}

	if streamMD == nil {
		streamMD = &StreamMetaData{
			S3PartsCount: miniblock.MediaStream.ChunkCount,
			S3PartsSize:  miniblock.MediaStream.ChunkSize,
		}
	}

	objectKey := streamIDToS3ObjectKey(streamID, objectKeyPrefix)

	if singlePutOperation := miniblock.MediaStream.ChunkCount == 1; singlePutOperation {
		putObjectResult, err := client.PutObject(ctx, &s3.PutObjectInput{
			Bucket: bucket,
			Key:    &objectKey,
			Body:   bytes.NewReader(miniblock.Data),
		})
		if err != nil {
			return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to write media miniblock to S3", err).
				Tags("stream", objectKey).
				Func("S3WriteMediaMiniblock/PutObject")
		}

		log := logging.FromCtx(ctx)
		log.Debug("S3 upload of media miniblock succeeded",
			"stream", streamID, "miniblock", miniblock.Number, "objectKey", objectKey, "etag", *putObjectResult.ETag)

		// append s3 info for later retrieval and decoding back into miniblock descriptor
		partNumber := int32(1) // single part upload always has part number 1
		part := &StreamMetaDataS3Part{
			ByteSize: uint64(len(miniblock.Data)),
			S3CompletionPart: &S3CompletedPart{
				ETag:       putObjectResult.ETag,
				PartNumber: &partNumber,
			},
		}

		streamMD.S3Parts = append(streamMD.S3Parts, part)

		return streamMD, nil
	}

	// write as part of a S3 multipart upload
	if streamMD.S3MultiPartUploadID == nil { // initiate a new multipart upload
		createMultipartUploadResult, err := client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
			Bucket: bucket,
			Key:    &objectKey,
		})
		if err != nil {
			return nil, RiverErrorWithBase(
				Err_DOWNSTREAM_NETWORK_ERROR,
				"Unable to initiate multipart upload to S3",
				err,
			).
				Tags("stream", streamID).
				Func("storeMiniblockInS3AsPartOfMultiPartUpload")
		}

		streamMD.S3MultiPartUploadID = createMultipartUploadResult.UploadId
	}

	s3PartNumber := miniblock.MediaStream.ChunkIndex + 1 // s3 parts start on 1, chunk index at 0

	uploadPartResult, err := client.UploadPart(ctx, &s3.UploadPartInput{
		Bucket:     bucket,
		Key:        &objectKey,
		PartNumber: &s3PartNumber,
		UploadId:   streamMD.S3MultiPartUploadID,
		Body:       bytes.NewReader(miniblock.Data),
	})
	if err != nil {
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to write media miniblock to S3", err).
			Tags("stream", streamID).
			Func("storeMiniblockInS3AsPartOfMultiPartUpload/UploadPart")
	}

	log := logging.FromCtx(ctx)
	log.Debug("media miniblock part written to S3",
		"stream", streamID, "miniblock", miniblock.Number, "objectKey", objectKey,
		"etag", *uploadPartResult.ETag, "uploadID", *streamMD.S3MultiPartUploadID,
		"partNumber", miniblock.MediaStream.ChunkIndex)

	streamMD.S3Parts = append(streamMD.S3Parts, &StreamMetaDataS3Part{
		ByteSize: uint64(len(miniblock.Data)),
		S3CompletionPart: &S3CompletedPart{
			ETag:       uploadPartResult.ETag,
			PartNumber: &s3PartNumber,
		},
	})

	// if all parts are uploaded complete the multipart upload
	if allPartsUploaded := len(streamMD.S3Parts) == int(streamMD.S3PartsCount); allPartsUploaded {
		completeMultipartUploadResult, err := client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
			Bucket:   bucket,
			Key:      &objectKey,
			UploadId: streamMD.S3MultiPartUploadID,
			MultipartUpload: &s3types.CompletedMultipartUpload{
				Parts: streamMD.MultiUploadParts(),
			},
		})
		if err != nil {
			return nil, RiverErrorWithBase(
				Err_DOWNSTREAM_NETWORK_ERROR,
				"Unable to complete multipart upload to S3",
				err,
			).
				Tags("stream", streamID).
				Func("storeMiniblockInS3AsPartOfMultiPartUpload/CompleteMultipartUpload")
		}

		streamMD.S3MultiPartCompletedEtag = completeMultipartUploadResult.ETag
	}

	return streamMD, nil
}

// S3ReadMediaMiniblocks reads the given miniblock from S3 and returns a slice of miniblock descriptors.
// The slice will contain the given miniblock and all other miniblocks that are part of the same S3 multipart upload.
// The slice will be empty if the miniblock is not found in S3.
func S3ReadMediaMiniblocks(
	ctx context.Context,
	client *s3.Client,
	bucket *string,
	streamID StreamId,
	objectKeyPrefix string,
	streamMD *StreamMetaData,
) ([]*MiniblockDescriptor, error) {
	if streamID.Type() != STREAM_MEDIA_BIN {
		return nil, RiverError(Err_BAD_STREAM_ID, "Unable to read miniblocks from non media stream").
			Tag("stream", streamID).
			Func("ReadMiniblocksFromS3Object")
	}

	if streamMD == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Missing stream metadata to read miniblocks from S3").
			Tag("stream", streamID).
			Func("ReadMiniblocksFromS3Object")
	}

	if len(streamMD.S3Parts) != int(streamMD.S3PartsCount) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Unable to read miniblocks from non-completed S3 object upload").
			Tag("stream", streamID).
			Func("ReadMiniblocksFromS3Object")
	}

	objectKey := streamIDToS3ObjectKey(streamID, objectKeyPrefix)
	getObjectResult, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: bucket,
		Key:    &objectKey,
	})
	if err != nil {
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to read S3 object", err).
			Tags("stream", streamID).
			Func("readMiniblocksFromS3/GetObject")
	}

	defer getObjectResult.Body.Close()

	// read object and use metadata info to decode into miniblocks
	s3objBytes, err := io.ReadAll(getObjectResult.Body)
	if err != nil {
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to read S3 object", err).
			Tags("objectKey", objectKey).
			Func("readMiniblocksFromS3/ReadAll")
	}

	start := uint64(0)
	s3objBytesLen := len(s3objBytes)
	results := make([]*MiniblockDescriptor, 0, streamMD.S3PartsCount)

	for i, part := range streamMD.S3Parts {
		if *part.S3CompletionPart.PartNumber < streamMD.S3PartsCount && start+part.ByteSize >= uint64(s3objBytesLen) {
			return nil, RiverError(Err_INTERNAL, "Unable to read miniblocks from S3 object (MISSING DATA)").
				Func("readMiniblocksFromS3/Part")
		}

		mb := MiniblockDescriptor{
			Number: int64(i + 1), // genesis isn't part of S3 object
			Data:   s3objBytes[start:min(int(start+part.ByteSize), len(s3objBytes))],
			MediaStream: &MediaStreamMiniblockDescriptor{
				ChunkSize:  streamMD.S3PartsSize,
				ChunkIndex: *part.S3CompletionPart.PartNumber - 1,
				ChunkCount: int32(len(streamMD.S3Parts)),
			},
		}

		results = append(results, &mb)
		start += part.ByteSize
	}

	return results, nil
}
