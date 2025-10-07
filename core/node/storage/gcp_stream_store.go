package storage

import (
	"context"
	"fmt"
	"io"
	"slices"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"

	gcpstorage "cloud.google.com/go/storage"
	"github.com/ethereum/go-ethereum/common"
)

const (
	// GCPMinimumUploadSize defines the minimum size of a media stream chunk before it's stored in GCP Storage.
	// Chunks smaller than GCPMinimumUploadSize are stored in the DB.
	GCPMinimumUploadSize = 100 * 1024
)

// GCPWriteMediaMiniblock writes the given miniblock to GCP Storage and returns metadata that includes
// details of the upload that can later be used to read the miniblock.
func GCPWriteMediaMiniblock(
	ctx context.Context,
	bucket *gcpstorage.BucketHandle,
	node common.Address,
	streamID StreamId,
	streamMD *MediaStreamExternalDataDescriptor,
	miniblock *MiniblockDescriptor,
) (*MediaStreamExternalDataDescriptor, error) {
	if streamID.Type() != STREAM_MEDIA_BIN {
		return nil, RiverError(Err_BAD_STREAM_ID, "Invalid stream type").
			Tag("stream", streamID).
			Func("GCPWriteMediaMiniblock")
	}

	if miniblock.MediaStream == nil {
		return nil, RiverError(Err_BAD_BLOCK, "Only media miniblock with descriptor can be stored in GCP").
			Tag("stream", streamID).
			Func("GCPWriteMediaMiniblock")
	}

	if streamMD == nil {
		streamMD = &MediaStreamExternalDataDescriptor{}
	}

	if singlePutOperation := miniblock.MediaStream.ChunkCount == 1; singlePutOperation {
		objectKey := ExternalStorageObjectKey(node, streamID)

		w := bucket.Object(objectKey).NewWriter(ctx)
		w.ContentType = protobufContentType

		if _, err := w.Write(miniblock.Data); err != nil {
			return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to write media miniblock to GCP", err).
				Tags("stream", streamID).
				Func("GCPWriteMediaMiniblock")
		}

		if err := w.Close(); err != nil {
			return nil, RiverErrorWithBase(
				Err_DOWNSTREAM_NETWORK_ERROR,
				"Unable to close writer media miniblock to GCP",
				err,
			).
				Tags("stream", streamID).
				Func("GCPWriteMediaMiniblock")
		}

		streamMD.ExternalBackend = "gcp"
		streamMD.Bucket = bucket.BucketName()
		streamMD.ChunkCount = 1
		streamMD.ChunkSize = miniblock.MediaStream.ChunkSize
		streamMD.Parts = append(streamMD.Parts, &MediaStreamExternalDataPartDescriptor{
			ByteSize: uint64(len(miniblock.Data)),
		})

		return streamMD, nil
	}

	rootObjectKey := ExternalStorageObjectKey(node, streamID)
	objectKey := fmt.Sprintf("%s/%d", rootObjectKey, miniblock.MediaStream.ChunkIndex)
	w := bucket.Object(objectKey).NewWriter(ctx)

	if _, err := w.Write(miniblock.Data); err != nil {
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to write media miniblock to GCP", err).
			Tags("stream", streamID).
			Func("GCPWriteMediaMiniblock")
	}

	if err := w.Close(); err != nil {
		return nil, RiverErrorWithBase(
			Err_DOWNSTREAM_NETWORK_ERROR,
			"Unable to close writer media miniblock to GCP",
			err,
		).
			Tags("stream", streamID).
			Func("GCPWriteMediaMiniblock")
	}

	streamMD.ExternalBackend = "gcp"
	streamMD.Bucket = bucket.BucketName()
	streamMD.ChunkCount = miniblock.MediaStream.ChunkCount
	streamMD.ChunkSize = miniblock.MediaStream.ChunkSize
	streamMD.Parts = append(streamMD.Parts, &MediaStreamExternalDataPartDescriptor{
		ByteSize:   uint64(len(miniblock.Data)),
		PartNumber: miniblock.MediaStream.ChunkIndex,
	})

	// if all parts are uploaded combine them into a single object and delete individual parts.
	// TODO: implement this using a multi part upload that isn't supported through the go sdk
	// and requires direct XML API calls.
	if len(streamMD.Parts) == int(streamMD.ChunkCount) {
		// combine all objects into a single object and remove parts
		slices.SortFunc(streamMD.Parts, func(a, b *MediaStreamExternalDataPartDescriptor) int {
			return int(a.PartNumber - b.PartNumber)
		})

		var objectParts []*gcpstorage.ObjectHandle
		for _, part := range streamMD.Parts {
			objectKey := fmt.Sprintf("%s/%d", rootObjectKey, part.PartNumber)
			objectParts = append(objectParts, bucket.Object(objectKey))
		}

		tempObjects, err := composeGCPObjects(ctx, bucket, rootObjectKey, objectParts)
		if err != nil {
			// best-effort cleanup of any temporary objects created before returning the error.
			for _, obj := range tempObjects {
				_ = obj.Delete(ctx)
			}
			return nil, RiverErrorWithBase(
				Err_DOWNSTREAM_NETWORK_ERROR,
				"Unable to combine media miniblock objects in GCP",
				err,
			).
				Tags("stream", streamID).
				Func("GCPWriteMediaMiniblock/ComposerFrom")
		}

		// now chunks are combined into a single object, remove parts and temporary objects
		for _, obj := range append(objectParts, tempObjects...) {
			_ = obj.Delete(ctx)
		}
	}

	return streamMD, nil
}

// GCPReadMediaMiniblocks reads the given miniblock from GCP Storage and returns a slice of miniblock descriptors.
func GCPReadMediaMiniblocks(
	ctx context.Context,
	bucket *gcpstorage.BucketHandle,
	streamID StreamId,
	node common.Address,
	streamMD *MediaStreamExternalDataDescriptor,
) ([]*MiniblockDescriptor, error) {
	if streamID.Type() != STREAM_MEDIA_BIN {
		return nil, RiverError(Err_BAD_STREAM_ID, "Unable to read miniblocks from non media stream").
			Tag("stream", streamID).
			Func("GCPReadMediaMiniblocks")
	}

	if streamMD == nil {
		return nil, RiverError(Err_NOT_FOUND, "Missing stream metadata to read miniblocks from GCP").
			Tag("stream", streamID).
			Func("GCPReadMediaMiniblocks")
	}

	if len(streamMD.Parts) != int(streamMD.ChunkCount) {
		return nil, RiverError(Err_NOT_FOUND, "Unable to read miniblocks from non-completed GCP object upload").
			Tag("stream", streamID).
			Func("GCPReadMediaMiniblocks")
	}

	objectKey := ExternalStorageObjectKey(node, streamID)
	r, err := bucket.Object(objectKey).NewReader(ctx)
	if err != nil {
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to read media miniblock from GCP", err).
			Tags("stream", streamID).
			Func("GCPReadMediaMiniblocks")
	}

	defer r.Close()

	objBytes, err := io.ReadAll(r)
	if err != nil {
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to read GCP Storage object", err).
			Tags("objectKey", objectKey).
			Func("GCPReadMediaMiniblocks/ReadAll")
	}

	start := uint64(0)
	objBytesLen := len(objBytes)
	results := make([]*MiniblockDescriptor, 0, streamMD.ChunkCount)

	for i, part := range streamMD.Parts {
		if start+part.ByteSize > uint64(objBytesLen) {
			return nil, RiverError(Err_INTERNAL, "Unable to read miniblocks from GCP Storage object (MISSING DATA)").
				Func("GCPReadMediaMiniblocks/Part")
		}

		mb := MiniblockDescriptor{
			Number: int64(i + 1), // genesis isn't part of object
			Data:   objBytes[start:min(int(start+part.ByteSize), len(objBytes))],
			MediaStream: &MediaStreamMiniblockDescriptor{
				ChunkSize:  streamMD.ChunkSize,
				ChunkIndex: int32(i),
				ChunkCount: int32(len(streamMD.Parts)),
			},
		}

		results = append(results, &mb)
		start += part.ByteSize
	}

	return results, nil
}

// composeGCPObjects composes the given source objects into the destination object located at dstKey.
// GCP only allows up to 32 sources per compose call. This helper handles larger inputs by
// incrementally composing at most 32 sources into temporary objects until the final compose can be
// executed.
func composeGCPObjects(
	ctx context.Context,
	bucket *gcpstorage.BucketHandle,
	dstKey string,
	sources []*gcpstorage.ObjectHandle,
) ([]*gcpstorage.ObjectHandle, error) {
	if len(sources) == 0 {
		return nil, nil
	}

	temporaryObjects := make([]*gcpstorage.ObjectHandle, 0)
	batchIndex := 0
	parts := sources

	for len(parts) > 32 {
		nextParts := make([]*gcpstorage.ObjectHandle, 0, (len(parts)+31)/32)
		for i := 0; i < len(parts); i += 32 {
			end := i + 32
			if end > len(parts) {
				end = len(parts)
			}

			batch := parts[i:end]
			tempKey := fmt.Sprintf("%s/tmp-%d", dstKey, batchIndex)
			tempObj := bucket.Object(tempKey)
			if _, err := tempObj.ComposerFrom(batch...).Run(ctx); err != nil {
				return append(temporaryObjects, tempObj), err
			}

			temporaryObjects = append(temporaryObjects, tempObj)
			nextParts = append(nextParts, tempObj)
			batchIndex++
		}

		parts = nextParts
	}

	dst := bucket.Object(dstKey)
	if _, err := dst.ComposerFrom(parts...).Run(ctx); err != nil {
		return temporaryObjects, err
	}

	return temporaryObjects, nil
}
