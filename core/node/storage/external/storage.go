package external

import (
	"context"
	"database/sql/driver"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"golang.org/x/sync/errgroup"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type (
	// MiniblockDataStorageLocation defines where miniblock data is stored.
	MiniblockDataStorageLocation byte

	// UploadSession is used to write miniblock data to external storage.
	UploadSession interface {
		// WriteMiniblockData writes the given miniblock data to external storage.
		WriteMiniblockData(ctx context.Context, miniblockNum int64, blockdata []byte) error
		// Finish writing to external storage and return the parts that are needed to
		// decode miniblocks from the object stored in external storage. An upload is
		// only finished after Finish didn't return an error.
		Finish(ctx context.Context) ([]MiniblockDescriptor, MiniblockDataStorageLocation, error)
		// Abort the upload session.
		// If Finish was called before this is a no-op.
		Abort()
	}

	// Storage defines the interface to upload and download miniblock data to/from external storage.
	Storage interface {
		// MigrateStreams returns true if streams that have their miniblock data
		// stored in the database must be actively migrated to external storage.
		MigrateStreams() bool

		// StartUploadSession starts an upload session for miniblock data to external storage.
		StartUploadSession(
			ctx context.Context,
			streamID StreamId,
			totalMiniblockDataSize uint64,
		) (UploadSession, error)

		// DownloadMiniblockData from external storage.
		// Accepts multiple ranges to download in a single request using HTTP multi-range.
		DownloadMiniblockData(
			ctx context.Context,
			streamID StreamId,
			parts []MiniblockDescriptor,
			ranges []MiniblockRange,
		) (map[int64][]byte, error)

		// SetMetrics sets the histogram metrics for upload and download operations.
		SetMetrics(uploadDuration, downloadDuration Histogram)
	}

	// TestStorage defines extra functionality specific for testing external storage.
	TestStorage interface {
		// TestDeleteExternalObject removes the miniblock data object from external storage.
		TestDeleteExternalObject(ctx context.Context, streamID StreamId) error
		// TestNormalizeStreamWithoutCallingEphemeralMonitor normalizes the stream without calling EphemeralMonitor.
		// This is useful for testing migration of existing streams to external storage.
		TestNormalizeStreamWithoutCallingEphemeralMonitor(
			ctx context.Context,
			streamId StreamId,
		) (common.Hash, error)
	}

	// MiniblockDescriptor holds information about a miniblock that is stored in
	// external storage in an object that combines all miniblocks for a stream.
	MiniblockDescriptor struct {
		// Number is the miniblock number.
		Number int64
		// StartByte is the byte offset of the miniblock in the combined object.
		StartByte uint64
		// MiniblockDataLength is the length of the miniblock data in the combined object.
		MiniblockDataLength uint64
	}

	// MiniblockRange represents a range of miniblocks to download.
	MiniblockRange struct {
		// FromInclusive is the first miniblock number to download (inclusive).
		FromInclusive int64
		// ToExclusive is the last miniblock number + 1 (exclusive).
		ToExclusive int64
	}

	storage struct {
		// schemaName must correspond with the database schema name and is used to prefix uploaded blobs.
		schemaName string

		s3 *struct {
			bucketName string
			region     string
			creds      aws.Credentials
			signer     *v4.Signer
		}

		gcs *struct {
			bucketName string
			creds      *google.Credentials
		}

		// migrateExistingStreams is true if streams that have their miniblock data stored in the DB
		// must be migrated to external storage.
		migrateExistingStreams bool
		// googleOauthTokenMu guards googleOauthToken.
		googleOauthTokenMu sync.Mutex
		// googleOauthToken is the token used to authenticate with Google Cloud Storage.
		googleOauthToken *oauth2.Token

		// metrics for observability
		uploadDuration   Histogram
		downloadDuration Histogram
	}

	// Histogram interface for recording duration observations
	Histogram interface {
		Observe(float64)
	}

	// byteRange represents a byte range in the object.
	byteRange struct {
		start int64
		end   int64
	}
)

const (
	// MiniblockDataStorageLocationDB indicates that the miniblock data is stored in the database.
	MiniblockDataStorageLocationDB MiniblockDataStorageLocation = 'D'
	// MiniblockDataStorageLocationS3 indicates that the miniblock data is stored in S3.
	MiniblockDataStorageLocationS3 MiniblockDataStorageLocation = 'S'
	// MiniblockDataStorageLocationGCS indicates that the miniblock data is stored in Google Cloud Storage.
	MiniblockDataStorageLocationGCS MiniblockDataStorageLocation = 'G'
	// gcsCredentialScope scopes the derived credential token to Google Cloud Storage API.
	gcsCredentialScope = "https://www.googleapis.com/auth/devstorage.read_write"
	// maxGCSConcurrentRangeRequestsPerDownload limits the number of concurrent GCS range requests
	// to prevent overwhelming the API and local resources.
	maxGCSConcurrentRangeRequestsPerDownload = 3
	// Retry configuration for transient network failures
	// maxRetries is the maximum number of retry attempts for transient failures.
	maxRetries = 3
	// initialBackoff is the initial backoff duration before the first retry.
	initialBackoff = 100 * time.Millisecond
	// maxBackoff is the maximum backoff duration between retries.
	maxBackoff = 2 * time.Second
	// backoffMultiplier is the multiplier for exponential backoff.
	backoffMultiplier = 2.0
)

// NewStorage instantiates a new factory based on the given configuration to write and read data to and
// from external storage.
func NewStorage(
	ctx context.Context,
	cfg *config.ExternalMediaStreamStorageConfig,
	schemaName string,
) (Storage, error) {
	if cfg.Gcs.Enabled() {
		jsonCredentials := []byte(cfg.Gcs.JsonCredentials)
		if !json.Valid(jsonCredentials) {
			if decoded := decodeBase64JSONCredentials(cfg.Gcs.JsonCredentials); len(decoded) > 0 {
				jsonCredentials = decoded
			}
		}

		creds, err := google.CredentialsFromJSON(ctx, jsonCredentials, gcsCredentialScope)
		if err != nil {
			return nil, RiverErrorWithBase(Err_BAD_CONFIG, "Unable to create GCP credentials", err).
				Func("NewStorage")
		}

		return &storage{
			schemaName:             schemaName,
			migrateExistingStreams: cfg.EnableMigrationExistingStreams,
			gcs: &struct {
				bucketName string
				creds      *google.Credentials
			}{
				bucketName: cfg.Gcs.Bucket,
				creds:      creds,
			},
		}, nil
	}
	if cfg.AwsS3.Enabled() {
		creds := aws.Credentials{
			AccessKeyID:     cfg.AwsS3.AccessKeyID,
			SecretAccessKey: cfg.AwsS3.SecretAccessKey,
			Source:          "external_media_stream_storage",
		}

		return &storage{
			schemaName:             schemaName,
			migrateExistingStreams: cfg.EnableMigrationExistingStreams,
			s3: &struct {
				bucketName string
				region     string
				creds      aws.Credentials
				signer     *v4.Signer
			}{
				bucketName: cfg.AwsS3.Bucket,
				region:     cfg.AwsS3.Region,
				creds:      creds,
				signer: v4.NewSigner(func(opts *v4.SignerOptions) {
					opts.DisableURIPathEscaping = true
				}),
			},
		}, nil
	}
	return nil, RiverError(Err_BAD_CONFIG, "No external storage configuration provided").
		Func("NewStorage")
}

func (s *storage) SetMetrics(uploadDuration, downloadDuration Histogram) {
	s.uploadDuration = uploadDuration
	s.downloadDuration = downloadDuration
}

func (s *storage) MigrateStreams() bool {
	return s != nil && s.migrateExistingStreams
}

func (s *storage) getGCSOauthToken() (*oauth2.Token, error) {
	refreshWhenAfter := time.Now().Add(5 * time.Minute)

	s.googleOauthTokenMu.Lock()
	defer s.googleOauthTokenMu.Unlock()

	if s.googleOauthToken == nil || s.googleOauthToken.Expiry.Before(refreshWhenAfter) {
		token, err := s.gcs.creds.TokenSource.Token()
		if err != nil {
			return nil, err
		}
		s.googleOauthToken = token
	}

	return s.googleOauthToken, nil
}

func (s *storage) StartUploadSession(
	ctx context.Context,
	streamID StreamId,
	totalMiniblockDataSize uint64,
) (UploadSession, error) {
	if s.gcs != nil {
		apiToken, err := s.getGCSOauthToken()
		if err != nil {
			return nil, RiverError(Err_BAD_CONFIG, "Unable to get GCS oauth token").
				Tag("streamId", streamID).
				Func("StartUploadSession")
		}

		return newGcsUploadSession(
			ctx, streamID, s.schemaName, s.gcs.bucketName, totalMiniblockDataSize, apiToken)
	}

	if s.s3 != nil {
		return newS3UploadSession(
			ctx,
			streamID,
			s.schemaName,
			s.s3.bucketName,
			s.s3.region,
			totalMiniblockDataSize,
			s.s3.signer,
			s.s3.creds,
		)
	}

	return nil, RiverError(Err_BAD_CONFIG, "No external storage backend configured").
		Func("StartUploadSession")
}

func (s *storage) DownloadMiniblockData(
	ctx context.Context,
	streamID StreamId,
	objectMiniblockParts []MiniblockDescriptor,
	ranges []MiniblockRange,
) (map[int64][]byte, error) {
	if len(objectMiniblockParts) == 0 {
		return nil, RiverError(Err_BAD_CONFIG, "no parts found for external media stream storage").
			Tag("streamId", streamID).
			Func("DownloadMiniblockData")
	}

	if len(ranges) == 0 {
		return nil, RiverError(Err_BAD_CONFIG, "no ranges specified for download").
			Tag("streamId", streamID).
			Func("DownloadMiniblockData")
	}

	// Convert all ranges to byte ranges and collect all miniblocks
	var byteRanges []byteRange
	allMiniblocks := make(map[int64]MiniblockDescriptor)

	for _, r := range ranges {
		offset, length, miniblocks, err := ObjectRangeMiniblocks(objectMiniblockParts, r.FromInclusive, r.ToExclusive)
		if err != nil {
			return nil, err
		}

		byteRanges = append(byteRanges, byteRange{
			start: offset,
			end:   offset + length - 1,
		})

		// Collect all miniblocks with their absolute byte positions
		for _, mb := range miniblocks {
			allMiniblocks[mb.Number] = MiniblockDescriptor{
				Number:              mb.Number,
				StartByte:           uint64(offset) + mb.StartByte,
				MiniblockDataLength: mb.MiniblockDataLength,
			}
		}
	}

	// Track download duration
	startTime := time.Now()
	defer func() {
		if s.downloadDuration != nil {
			s.downloadDuration.Observe(time.Since(startTime).Seconds())
		}
	}()

	if s.s3 != nil {
		return s.downloadMiniblockDataFromS3(ctx, streamID, byteRanges, allMiniblocks)
	}

	if s.gcs != nil {
		return s.downloadMiniblockDataFromGCSConcurrent(ctx, streamID, byteRanges, allMiniblocks)
	}

	return nil, RiverError(Err_BAD_CONFIG, "No external storage backend configured").
		Tag("streamId", streamID).
		Func("DownloadMiniblockData")
}

func (s *storage) downloadMiniblockDataFromS3(
	ctx context.Context,
	streamID StreamId,
	ranges []byteRange,
	miniblocks map[int64]MiniblockDescriptor,
) (map[int64][]byte, error) {
	objectKey := StorageObjectKey(s.schemaName, streamID)
	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.s3.bucketName, s.s3.region, objectKey)
	rangeHeader := buildRangeHeader(ranges)

	var data []byte

	// Retry the download operation with exponential backoff
	err := retryWithBackoff(ctx, "S3 download", func() (int, error) {
		// Create request for this attempt
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return 0, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
				"failed to create S3 object request", err).
				Tag("streamId", streamID).
				Tag("objectKey", objectKey).
				Func("downloadMiniblockDataFromS3")
		}
		req.Header.Set("x-amz-content-sha256", s3UnsignedPayloadSHA)

		// Set Range header if needed
		if rangeHeader != "" {
			req.Header.Set("Range", rangeHeader)
		}

		// Sign the request
		if err := s.s3.signer.SignHTTP(ctx, s.s3.creds, req, s3UnsignedPayloadSHA, s3ServiceName, s.s3.region, time.Now()); err != nil {
			return 0, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
				"failed to sign S3 range request", err).
				Tag("streamId", streamID).
				Tag("objectKey", objectKey).
				Func("downloadMiniblockDataFromS3")
		}

		// Execute request
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return 0, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
				"failed to download miniblock data from S3", err).
				Tag("streamId", streamID).
				Tag("objectKey", objectKey).
				Func("downloadMiniblockDataFromS3")
		}
		defer drainAndCloseResponseBody(resp)

		// Check status code
		if resp.StatusCode != http.StatusPartialContent && resp.StatusCode != http.StatusOK {
			return resp.StatusCode, RiverError(Err_DOWNSTREAM_NETWORK_ERROR,
				"unexpected status code when downloading miniblocks from S3").
				Tag("streamId", streamID).
				Tag("objectKey", objectKey).
				Tag("statusCode", resp.StatusCode).
				Tag("status", resp.Status).
				Func("downloadMiniblockDataFromS3")
		}

		// Read all data from response
		data, err = io.ReadAll(resp.Body)
		if err != nil {
			return resp.StatusCode, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
				"failed to read response body from S3", err).
				Tag("streamId", streamID).
				Tag("objectKey", objectKey).
				Func("downloadMiniblockDataFromS3")
		}

		return resp.StatusCode, nil
	})
	if err != nil {
		return nil, err
	}

	// Extract miniblocks from the downloaded data
	return extractMiniblocks(data, ranges, miniblocks)
}

func (s *storage) downloadMiniblockDataFromGCS(
	ctx context.Context,
	streamID StreamId,
	rng byteRange,
	miniblocks map[int64]MiniblockDescriptor,
) (map[int64][]byte, error) {
	objectKey := StorageObjectKey(s.schemaName, streamID)
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.gcs.bucketName, objectKey)
	rangeHeader := buildRangeHeader([]byteRange{rng})

	var data []byte

	// Retry the download operation with exponential backoff
	err := retryWithBackoff(ctx, "GCS download", func() (int, error) {
		// Get OAuth token for this attempt (may need refresh)
		token, err := s.getGCSOauthToken()
		if err != nil {
			return 0, RiverError(Err_BAD_CONFIG, "Unable to get GCS oauth token").
				Tag("streamId", streamID).
				Func("downloadMiniblockDataFromGCS")
		}

		// Create request for this attempt
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return 0, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
				"failed to create GCS object request", err).
				Tag("streamId", streamID).
				Tag("objectKey", objectKey).
				Func("downloadMiniblockDataFromGCS")
		}
		req.Header.Set("Authorization", "Bearer "+token.AccessToken)

		// Set Range header if needed
		if rangeHeader != "" {
			req.Header.Set("Range", rangeHeader)
		}

		// Execute request
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return 0, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
				"failed to download miniblock data from GCS", err).
				Tag("streamId", streamID).
				Tag("objectKey", objectKey).
				Func("downloadMiniblockDataFromGCS")
		}
		defer drainAndCloseResponseBody(resp)

		// Check status code
		if resp.StatusCode != http.StatusPartialContent && resp.StatusCode != http.StatusOK {
			return resp.StatusCode, RiverError(Err_DOWNSTREAM_NETWORK_ERROR,
				"unexpected status code when downloading miniblocks from GCS").
				Tag("streamId", streamID).
				Tag("objectKey", objectKey).
				Tag("statusCode", resp.StatusCode).
				Tag("status", resp.Status).
				Func("downloadMiniblockDataFromGCS")
		}

		// Read all data from response
		data, err = io.ReadAll(resp.Body)
		if err != nil {
			return resp.StatusCode, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
				"failed to read response body from GCS", err).
				Tag("streamId", streamID).
				Tag("objectKey", objectKey).
				Func("downloadMiniblockDataFromGCS")
		}

		return resp.StatusCode, nil
	})
	if err != nil {
		return nil, err
	}

	// Extract miniblocks from the downloaded data
	return extractMiniblocks(data, []byteRange{rng}, miniblocks)
}

// downloadMiniblockDataFromGCSConcurrent downloads multiple byte ranges from GCS concurrently
// using a worker pool pattern to improve performance when fetching non-contiguous ranges.
func (s *storage) downloadMiniblockDataFromGCSConcurrent(
	ctx context.Context,
	streamID StreamId,
	byteRanges []byteRange,
	allMiniblocks map[int64]MiniblockDescriptor,
) (map[int64][]byte, error) {
	// Handle empty case
	if len(byteRanges) == 0 {
		return make(map[int64][]byte), nil
	}

	// For single range, use the simple path
	if len(byteRanges) == 1 {
		r := byteRanges[0]
		// Filter miniblocks to only those in this byte range
		rangeMiniblocks := make(map[int64]MiniblockDescriptor)
		for mbNum, mb := range allMiniblocks {
			mbStart := int64(mb.StartByte)
			mbEnd := mbStart + int64(mb.MiniblockDataLength)
			if mbStart >= r.start && mbEnd <= r.end+1 {
				rangeMiniblocks[mbNum] = mb
			}
		}
		return s.downloadMiniblockDataFromGCS(ctx, streamID, r, rangeMiniblocks)
	}

	// Use worker pool for multiple ranges
	results := make(map[int64][]byte)
	var resultsMu sync.Mutex

	// Create error group with context for coordinated cancellation
	g, gctx := errgroup.WithContext(ctx)

	// Limit concurrency to avoid overwhelming GCS API
	g.SetLimit(maxGCSConcurrentRangeRequestsPerDownload)

	// Launch workers for each range
	for _, r := range byteRanges {
		// Capture range variable for goroutine
		rng := r

		g.Go(func() error {
			// Filter miniblocks to only those in this byte range
			rangeMiniblocks := make(map[int64]MiniblockDescriptor)
			for mbNum, mb := range allMiniblocks {
				mbStart := int64(mb.StartByte)
				mbEnd := mbStart + int64(mb.MiniblockDataLength)
				if mbStart >= rng.start && mbEnd <= rng.end+1 {
					rangeMiniblocks[mbNum] = mb
				}
			}

			// Download this range
			miniblocks, err := s.downloadMiniblockDataFromGCS(gctx, streamID, rng, rangeMiniblocks)
			if err != nil {
				return err
			}

			// Merge results under lock
			resultsMu.Lock()
			for mbNum, data := range miniblocks {
				results[mbNum] = data
			}
			resultsMu.Unlock()

			return nil
		})
	}

	// Wait for all workers to complete
	if err := g.Wait(); err != nil {
		return nil, err
	}

	return results, nil
}

func (s *storage) DeleteObject(ctx context.Context, streamID StreamId) error {
	if s.s3 != nil {
		return s.deleteObjectFromS3(ctx, streamID)
	}

	if s.gcs != nil {
		return s.deleteObjectFromGCS(ctx, streamID)
	}

	return RiverError(Err_BAD_CONFIG, "No external storage backend configured").
		Tag("streamId", streamID).
		Func("DeleteObject")
}

func (s *storage) deleteObjectFromS3(ctx context.Context, streamID StreamId) error {
	objectKey := StorageObjectKey(s.schemaName, streamID)
	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.s3.bucketName, s.s3.region, objectKey)
	httpClient := http.DefaultClient

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"failed to create S3 delete object request", err).
			Tag("streamId", streamID).
			Tag("objectKey", objectKey).
			Func("DeleteObject")
	}
	req.Header.Set("x-amz-content-sha256", s3UnsignedPayloadSHA)

	if err := s.s3.signer.SignHTTP(ctx, s.s3.creds, req, s3UnsignedPayloadSHA, s3ServiceName, s.s3.region, time.Now()); err != nil {
		return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"failed to sign S3 delete request", err).
			Tag("streamId", streamID).
			Tag("objectKey", objectKey).
			Func("DeleteObject")
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"failed to delete object from S3", err).
			Tag("streamId", streamID).
			Tag("objectKey", objectKey).
			Func("DeleteObject")
	}
	defer drainAndCloseResponseBody(resp)

	// 204 No Content means successful deletion, 404 Not Found means already deleted
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusNotFound {
		return RiverError(Err_DOWNSTREAM_NETWORK_ERROR,
			"unexpected status code when deleting object from S3").
			Tag("streamId", streamID).
			Tag("objectKey", objectKey).
			Tag("statusCode", resp.StatusCode).
			Tag("status", resp.Status).
			Func("DeleteObject")
	}

	return nil
}

func (s *storage) deleteObjectFromGCS(ctx context.Context, streamID StreamId) error {
	objectKey := StorageObjectKey(s.schemaName, streamID)
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.gcs.bucketName, objectKey)
	httpClient := http.DefaultClient

	token, err := s.getGCSOauthToken()
	if err != nil {
		return RiverError(Err_BAD_CONFIG, "Unable to get GCS oauth token").
			Tag("streamId", streamID).
			Func("DeleteObject")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"failed to create GCS delete object request", err).
			Tag("streamId", streamID).
			Tag("objectKey", objectKey).
			Func("DeleteObject")
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := httpClient.Do(req)
	if err != nil {
		return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"failed to delete object from GCS", err).
			Tag("streamId", streamID).
			Tag("objectKey", objectKey).
			Func("DeleteObject")
	}
	defer drainAndCloseResponseBody(resp)

	// 204 No Content means successful deletion, 404 Not Found means already deleted
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusNotFound {
		return RiverError(Err_DOWNSTREAM_NETWORK_ERROR,
			"unexpected status code when deleting object from GCS").
			Tag("streamId", streamID).
			Tag("objectKey", objectKey).
			Tag("statusCode", resp.StatusCode).
			Tag("status", resp.Status).
			Func("DeleteObject")
	}

	return nil
}

// buildRangeHeader creates an HTTP Range header for multiple byte ranges.
// For a single range, returns "bytes=start-end".
// For multiple ranges, returns "bytes=start1-end1,start2-end2,..."
func buildRangeHeader(ranges []byteRange) string {
	if len(ranges) == 0 {
		return ""
	}

	if len(ranges) == 1 {
		return fmt.Sprintf("bytes=%d-%d", ranges[0].start, ranges[0].end)
	}

	// Build multi-range header
	var rangeStr string
	for i, r := range ranges {
		if i > 0 {
			rangeStr += ","
		}
		rangeStr += fmt.Sprintf("%d-%d", r.start, r.end)
	}
	return "bytes=" + rangeStr
}

// extractMiniblocks extracts individual miniblocks from downloaded data.
// For single-range responses, the data contains the requested range directly.
// For multi-range responses, the data may be in multipart format, but since we're
// requesting contiguous ranges and reading the entire response, we can extract
// miniblocks by their absolute byte positions.
func extractMiniblocks(
	data []byte,
	ranges []byteRange,
	miniblocks map[int64]MiniblockDescriptor,
) (map[int64][]byte, error) {
	results := make(map[int64][]byte)

	// Calculate the starting offset of the downloaded data
	var startOffset int64
	if len(ranges) > 0 {
		startOffset = ranges[0].start
	}

	// Extract each miniblock from the data
	for mbNum, mb := range miniblocks {
		// Calculate the position of this miniblock in the downloaded data
		relativeStart := int64(mb.StartByte) - startOffset
		relativeEnd := relativeStart + int64(mb.MiniblockDataLength)

		// Validate bounds
		if relativeStart < 0 || relativeEnd > int64(len(data)) {
			return nil, RiverError(Err_INTERNAL, "miniblock data out of bounds").
				Tag("miniblock", mbNum).
				Tag("relativeStart", relativeStart).
				Tag("relativeEnd", relativeEnd).
				Tag("dataLength", len(data)).
				Func("extractMiniblocks")
		}

		// Extract the miniblock data
		results[mbNum] = data[relativeStart:relativeEnd]
	}

	return results, nil
}

// isRetryableError determines if an error or HTTP status code is retryable.
// Returns true for transient network errors, rate limits, and temporary server errors.
func isRetryableError(err error, statusCode int) bool {
	// If we have a status code, use it to determine retryability
	if statusCode != 0 {
		switch statusCode {
		case http.StatusTooManyRequests, // 429 - Rate limit
			http.StatusInternalServerError, // 500 - Server error
			http.StatusBadGateway,          // 502 - Bad gateway
			http.StatusServiceUnavailable,  // 503 - Service unavailable
			http.StatusGatewayTimeout:      // 504 - Gateway timeout
			return true
		default:
			// For other status codes (2xx, 4xx), don't retry
			return false
		}
	}

	// No status code - check if error is retryable
	if err != nil {
		// Context cancellation and deadline exceeded are not retryable
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return false
		}
		// Network errors, timeouts, and temporary errors are retryable
		return true
	}

	return false
}

// retryWithBackoff executes a function with exponential backoff retry logic.
// It retries on transient network failures up to maxRetries times.
func retryWithBackoff(ctx context.Context, operation string, fn func() (int, error)) error {
	backoff := initialBackoff
	var lastErr error
	var lastStatusCode int

	for attempt := 0; attempt <= maxRetries; attempt++ {
		// Execute the operation
		statusCode, err := fn()
		lastErr = err
		lastStatusCode = statusCode

		// Success - return immediately
		if err == nil {
			return nil
		}

		// Check if we should retry
		if !isRetryableError(err, statusCode) {
			// Non-retryable error, return immediately
			return err
		}

		// Don't sleep after the last attempt
		if attempt == maxRetries {
			break
		}

		// Check context before sleeping
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(backoff):
			// Continue to next attempt
		}

		// Exponential backoff with cap
		backoff = time.Duration(float64(backoff) * backoffMultiplier)
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}

	// All retries exhausted
	return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
		fmt.Sprintf("%s failed after %d retries", operation, maxRetries), lastErr).
		Tag("lastStatusCode", lastStatusCode).
		Tag("attempts", maxRetries+1)
}

// StorageObjectKey returns the object key where the miniblocks for the given
// streamID are stored in external storage.
func StorageObjectKey(schemaName string, streamID StreamId) string {
	return fmt.Sprintf("%s/%s", schemaName, streamID)
}

// ObjectRangeMiniblocks returns a range that can be used to download a byte range of an
// externally stored object that contains multiple miniblocks allowing to decode a miniblock
// range without the need to download the entire object.
//
// allObjectMiniblockParts are all the miniblocks that are combined in the object.
// fromInclusive is the first miniblock number
// toExclusive is the last miniblock number + 1
//
// The returned offset indicates which is the first byte to download from the object.
// The returned size indicates how many bytes of the object from offset must be read.
// The returned rangeParts describe how to decode the miniblocks from the object bytes.
func ObjectRangeMiniblocks(
	allObjectMiniblockParts []MiniblockDescriptor,
	fromInclusive int64,
	toExclusive int64,
) (offset int64, size int64, rangeParts []MiniblockDescriptor, err error) {
	foundFirstPart := false
	foundLastPart := false

	for _, p := range allObjectMiniblockParts {
		partAlreadyAdded := false

		if !foundFirstPart {
			foundFirstPart = p.Number == fromInclusive
			if foundFirstPart {
				offset = int64(p.StartByte)
				rangeParts = append(rangeParts, MiniblockDescriptor{
					Number:              p.Number,
					StartByte:           0, // start at the beginning of the range decoding miniblocks
					MiniblockDataLength: p.MiniblockDataLength,
				})
				size = int64(p.MiniblockDataLength)
				partAlreadyAdded = true

				foundFirstPart = true
			}
		}

		if foundFirstPart {
			if !partAlreadyAdded {
				rangeParts = append(rangeParts, MiniblockDescriptor{
					Number:              p.Number,
					StartByte:           uint64(size),
					MiniblockDataLength: p.MiniblockDataLength,
				})
				size += int64(p.MiniblockDataLength)
			}

			foundLastPart = p.Number == toExclusive-1
		}

		if foundLastPart {
			break
		}
	}

	if !foundFirstPart || !foundLastPart {
		return 0, 0, nil, RiverError(
			Err_INTERNAL, "Invalid range requested").
			Tag("fromInclusive", fromInclusive).
			Tag("toExclusive", toExclusive).
			Func("ObjectRangeMiniblocks")
	}

	return offset, size, rangeParts, nil
}

// Value implements river.Valuer for MiniblockDataStorageLocation.
// This ensures that MiniblockDataStorageLocation can be written to database
// and is compatible with MiniblockDataStorageLocation#Scan.
func (loc MiniblockDataStorageLocation) Value() (driver.Value, error) {
	return string(loc), nil
}

// Scan implements sql.Scanner for MiniblockDataStorageLocation.
// This ensures that MiniblockDataStorageLocation can be read from database
// and is compatible with MiniblockDataStorageLocation#Value.
func (loc *MiniblockDataStorageLocation) Scan(src interface{}) error {
	var str string
	switch v := src.(type) {
	case string:
		str = v
	case []byte:
		str = string(v)
	default:
		return RiverError(Err_INTERNAL, "Unable to scan miniblock storage location from DB").
			Func("MiniblockDataStorageLocation.Scan").
			Tags("raw", src, "rawType", fmt.Sprintf("%T", src))
	}

	if len(str) == 0 { // default is DB
		*loc = MiniblockDataStorageLocationDB
		return nil
	}
	if len(str) == 1 {
		*loc = MiniblockDataStorageLocation(str[0])
		return nil
	}

	return RiverError(Err_INTERNAL, "Unable to scan miniblock storage location from DB").
		Func("MiniblockDataStorageLocation.Scan").
		Tags("raw", src, "rawType", fmt.Sprintf("%T", src))
}

func (loc MiniblockDataStorageLocation) String() string {
	switch loc {
	case MiniblockDataStorageLocationDB:
		return "db"
	case MiniblockDataStorageLocationGCS:
		return "gcs"
	case MiniblockDataStorageLocationS3:
		return "s3"
	default:
		return "unknown"
	}
}

// decodeBase64JSONCredentials attempts to treat the provided string as base64 and returns the decoded bytes if they
// form valid JSON.
func decodeBase64JSONCredentials(value string) []byte {
	if value == "" {
		return nil
	}

	for _, encoding := range []*base64.Encoding{base64.StdEncoding, base64.RawStdEncoding} {
		decoded, err := encoding.DecodeString(value)
		if err != nil {
			continue
		}
		if json.Valid(decoded) {
			return decoded
		}
	}

	return nil
}
