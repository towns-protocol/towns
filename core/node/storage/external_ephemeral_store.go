package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"math"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// Retry configuration
const (
	maxRetries = 3
	baseDelay  = 100 * time.Millisecond
	maxDelay   = 5 * time.Second
)

// retryWithBackoff executes a function with exponential backoff retry logic
func retryWithBackoff(ctx context.Context, operation string, fn func() error) error {
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// Calculate delay with exponential backoff
			delay := min(time.Duration(float64(baseDelay)*math.Pow(2, float64(attempt-1))), maxDelay)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		}

		err := fn()
		if err == nil {
			return nil
		}

		lastErr = err

		// Don't retry on certain errors (e.g., authentication, invalid parameters)
		if !isRetryableError(err) {
			return err
		}
	}

	return RiverError(Err_INTERNAL, fmt.Sprintf("%s failed after %d attempts: %w", operation, maxRetries+1, lastErr))
}

// isRetryableError determines if an error should be retried
func isRetryableError(err error) bool {
	// Add logic to check for retryable errors
	// For now, retry all errors except context cancellation
	return err != context.Canceled && err != context.DeadlineExceeded
}

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

	var uploadID string
	err := retryWithBackoff(ctx, "CreateMultipartUpload", func() error {
		output, err := w.s3Client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
			Bucket: &w.bucket,
			Key:    &key,
			Metadata: map[string]string{
				"stream-id": fmt.Sprintf("%x", streamId),
				"created":   time.Now().Format(time.RFC3339),
			},
		})
		if err != nil {
			return err
		}
		uploadID = *output.UploadId
		return nil
	})
	if err != nil {
		return "", RiverError(Err_INTERNAL, "failed to create multipart upload", "error", err)
	}

	return uploadID, nil
}

func (w *ExternalMediaStore) UploadPartToExternalMediaStream(
	ctx context.Context,
	streamId StreamId,
	data []byte,
	uploadID string,
	miniblock int64,
) (string, error) {
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)

	var etag string
	err := retryWithBackoff(ctx, "UploadPart", func() error {
		tag, err := w.s3Client.UploadPart(ctx, &s3.UploadPartInput{
			Bucket: &w.bucket,
			Key:    &key,
			// Part number is 1-indexed
			PartNumber:    int32(miniblock + 1),
			UploadId:      &uploadID,
			Body:          bytes.NewReader(data),
			ContentLength: int64(len(data)),
		})
		if err != nil {
			return err
		}
		etag = *tag.ETag
		return nil
	})
	if err != nil {
		return "", RiverError(Err_INTERNAL, "failed to upload part", "error", err)
	}
	return etag, nil
}

func (w *ExternalMediaStore) CompleteMediaStreamUpload(
	ctx context.Context,
	streamId StreamId,
	uploadID string,
	etags []Etag,
) error {
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)

	// Convert to []types.CompletedPart
	var parts []types.CompletedPart
	for _, etag := range etags {
		parts = append(parts, types.CompletedPart{
			ETag: &etag.Etag,
			// Part number is 1-indexed
			PartNumber: int32(etag.Miniblock + 1),
		})
	}

	err := retryWithBackoff(ctx, "CompleteMultipartUpload", func() error {
		_, err := w.s3Client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
			Bucket:   &w.bucket,
			Key:      &key,
			UploadId: &uploadID,
			MultipartUpload: &types.CompletedMultipartUpload{
				Parts: parts,
			},
		})
		return err
	})
	if err != nil {
		// If completion fails, abort the upload to clean up
		abortErr := w.AbortMediaStreamUpload(ctx, streamId, uploadID)
		if abortErr != nil {
			return RiverError(Err_INTERNAL, "failed to complete multipart upload", "error", err, "abortErr", abortErr)
		}
		return RiverError(Err_INTERNAL, "failed to complete multipart upload", "error", err)
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

	err := retryWithBackoff(ctx, "AbortMultipartUpload", func() error {
		_, err := w.s3Client.AbortMultipartUpload(ctx, &s3.AbortMultipartUploadInput{
			Bucket:   &w.bucket,
			Key:      &key,
			UploadId: &uploadID,
		})
		return err
	})
	if err != nil {
		return RiverError(Err_INTERNAL, "failed to abort multipart upload", "error", err)
	}
	return nil
}

func (w *ExternalMediaStore) GetBucket() string {
	return w.bucket
}

func DownloadRangeFromExternalMediaStream(
	ctx context.Context,
	streamId StreamId,
	rangeHeaders []MiniblockRange,
	bucket string,
	client *s3.Client,
) ([]byte, error) {
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)

	// Get the range of the entire data to read
	rangeHeader := fmt.Sprintf(
		"bytes=%d-%d",
		rangeHeaders[0].StartInclusive,
		rangeHeaders[len(rangeHeaders)-1].EndInclusive,
	)

	var data []byte
	err := retryWithBackoff(ctx, "GetObject", func() error {
		// Download chunk from S3 with range header
		output, err := client.GetObject(ctx, &s3.GetObjectInput{
			Bucket: &bucket,
			Key:    &key,
			Range:  aws.String(rangeHeader),
		})
		if err != nil {
			return err
		}
		defer output.Body.Close()

		bodyData, err := io.ReadAll(output.Body)
		if err != nil {
			return err
		}
		data = bodyData
		return nil
	})
	if err != nil {
		return nil, RiverError(Err_INTERNAL, "failed to download range", "error", err, "rangeHeader", rangeHeader)
	}

	return data, nil
}

func CreateExternalClient() (*s3.Client, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return nil, RiverError(Err_INTERNAL, "unable to load SDK config", "error", err)
	}
	return s3.NewFromConfig(cfg), nil
}
