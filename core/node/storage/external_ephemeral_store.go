package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"

	. "github.com/towns-protocol/towns/core/node/shared"
)

type ExternalMediaStore struct {
	s3Client *s3.Client
	bucket   string
}

func NewExternalMediaStore(bucket string) *ExternalMediaStore {
	var s3Client *s3.Client

	if bucket != "" {
		var err error
		s3Client, err = CreateExternalClient()
		if err != nil {
			panic(err)
		}
	}

	return &ExternalMediaStore{
		s3Client: s3Client,
		bucket:   bucket,
	}
}

func (w *ExternalMediaStore) CreateExternalMediaStream(
	ctx context.Context,
	streamId StreamId,
	data []byte,
) (string, error) {
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)
	
	// Start multipart upload
	output, err := w.s3Client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
		Bucket: &w.bucket,
		Key:    &key,
		Metadata: map[string]string{
			"stream-id": fmt.Sprintf("%x", streamId),
			"created":   time.Now().Format(time.RFC3339),
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to create multipart upload: %w", err)
	}
	
	return *output.UploadId, nil
}

func (w *ExternalMediaStore) UploadChunkToExternalMediaStream(
	ctx context.Context,
	streamId StreamId,
	data []byte,
	uploadID string,
	partNum int,
) (string, error) {
	
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)
	
	// Upload part
	tag, err := w.s3Client.UploadPart(ctx, &s3.UploadPartInput{
		Bucket:        &w.bucket,
		Key:           &key,
		PartNumber:    int32(partNum),
		UploadId:      &uploadID,
		Body:          bytes.NewReader(data),
		ContentLength: int64(len(data)),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload part: %w", err)
	}
	return *tag.ETag, nil
}

func (w *ExternalMediaStore) CompleteMediaStreamUpload(
	ctx context.Context,
	streamId StreamId,
	uploadID string,
	etags []struct {PartNumber int; Etag string},
) error {
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)
	
	// Convert map[int]string to []types.CompletedPart
	var parts []types.CompletedPart
	for _, etag := range etags {
		parts = append(parts, types.CompletedPart{
			ETag:       &etag.Etag,
			PartNumber: int32(etag.PartNumber),
		})
	}
	
	// Complete the multipart upload
	_, err := w.s3Client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
		Bucket:   &w.bucket,
		Key:      &key,
		UploadId: &uploadID,
		MultipartUpload: &types.CompletedMultipartUpload{
			Parts: parts,
		},
	})
	if err != nil {
		// If completion fails, abort the upload to clean up
		abortErr := w.AbortMediaStreamUpload(ctx, streamId, uploadID)
		if abortErr != nil {
			return fmt.Errorf("failed to complete multipart upload: %w, and failed to abort: %v", err, abortErr)
		}
		return fmt.Errorf("failed to complete multipart upload: %w", err)
	}
	return nil
}

// AbortMediaStreamUpload aborts a multipart upload and cleans up resources
func (w *ExternalMediaStore) AbortMediaStreamUpload(
	ctx context.Context,
	streamId StreamId,
	uploadID string,
) error {
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)
	
	_, err := w.s3Client.AbortMultipartUpload(ctx, &s3.AbortMultipartUploadInput{
		Bucket:   &w.bucket,
		Key:      &key,
		UploadId: &uploadID,
	})
	if err != nil {
		return fmt.Errorf("failed to abort multipart upload: %w", err)
	}
	return nil
}

func (w *ExternalMediaStore) GetBucket() string {
	return w.bucket
}

func DownloadChunkFromExternal(
	ctx context.Context,
	streamId StreamId,
	rangeHeader string,
	bucket string,
	client *s3.Client,
) ([]byte, error) {
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)

	// Download chunk from S3 with range header
	output, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &bucket,
		Key:    &key,
		Range:  aws.String(rangeHeader),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to download range %s from S3: %w", rangeHeader, err)
	}
	defer output.Body.Close()

	data, err := io.ReadAll(output.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read S3 object range body: %w", err)
	}

	return data, nil
}

func CreateExternalClient() (*s3.Client, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %w", err)
	}
	return s3.NewFromConfig(cfg), nil
}