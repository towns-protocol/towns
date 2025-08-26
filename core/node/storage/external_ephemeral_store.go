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
) ([]byte, error) {
	// Generate S3 key: streams/{streamId}/{timestamp}
	key := fmt.Sprintf("streams/%x/%d", streamId, time.Now().UnixNano())

	// Upload to S3
	_, err := w.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: &w.bucket,
		Key:    &key,
		Body:   bytes.NewReader(data),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Return S3 URL
	return fmt.Appendf(nil, "s3://%s/%s", w.bucket, key), nil
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