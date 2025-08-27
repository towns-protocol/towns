package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	. "github.com/towns-protocol/towns/core/node/shared"
)

type ExternalMediaStore struct {
	s3Client *s3.Client
	bucket   string
}

func NewExternalMediaStore() *ExternalMediaStore {
	var s3Client *s3.Client
	var bucket string

	// TODO: Configuration should be added to chain or config files
	// For now, check environment variable as a temporary solution
	if os.Getenv("STORAGE_TYPE") == "external" {
		var err error
		s3Client, err = CreateExternalClient()
		if err != nil {
			panic(err)
		}
		bucket = os.Getenv("S3_BUCKET")
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
	
	// Return the upload ID
	return *output.UploadId, nil
}

func (w *ExternalMediaStore) UploadPartToExternalMediaStream(
	ctx context.Context,
	streamId StreamId,
	data []byte,
	location []byte,
	uploadID string,
	partNumber int,
) error {
	
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)
	
	// Upload part
	_, err := w.s3Client.UploadPart(ctx, &s3.UploadPartInput{
		Bucket:        &w.bucket,
		Key:           &key,
		PartNumber:    int32(partNumber),
		UploadId:      &uploadID,
		Body:          bytes.NewReader(data),
		ContentLength: int64(len(data)),
	})
	if err != nil {
		return fmt.Errorf("failed to upload part: %w", err)
	}
	return nil
}

func (w *ExternalMediaStore) CompleteMediaStreamUpload(
	ctx context.Context,
	streamId StreamId,
	uploadID string,
) error {
	// Generate S3 key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)
	
	// Complete the multipart upload
	_, err := w.s3Client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
		Bucket:   &w.bucket,
		Key:      &key,
		UploadId: &uploadID,
	})
	if err != nil {
		return fmt.Errorf("failed to complete multipart upload: %w", err)
	}
	return nil
}

func (w *ExternalMediaStore) DownloadFromExternal(
	ctx context.Context,
	streamId StreamId,
	key string,
) ([]byte, error) {
	if w.s3Client == nil {
		return nil, fmt.Errorf("S3 client is not initialized")
	}
	if w.bucket == "" {
		return nil, fmt.Errorf("S3 bucket is not set")
	}

	// Download from S3
	output, err := w.s3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &w.bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to download from S3: %w", err)
	}
	defer output.Body.Close()

	data, err := io.ReadAll(output.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read S3 object body: %w", err)
	}

	return data, nil
}

// Helper function to create S3 client (implementation depends on your AWS setup)
func CreateExternalClient() (*s3.Client, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %w", err)
	}
	return s3.NewFromConfig(cfg), nil
}