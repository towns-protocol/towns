package storage

import (
	"bytes"
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// GCS XML API structures
type InitiateMultipartUploadResult struct {
	XMLName  xml.Name `xml:"InitiateMultipartUploadResult"`
	Bucket   string   `xml:"Bucket"`
	Key      string   `xml:"Key"`
	UploadId string   `xml:"UploadId"`
}

type CompleteMultipartUpload struct {
	XMLName xml.Name `xml:"CompleteMultipartUpload"`
	Parts   []Part   `xml:"Part"`
}

type Part struct {
	XMLName    xml.Name `xml:"Part"`
	PartNumber int64    `xml:"PartNumber"`
	ETag       string   `xml:"ETag"`
}

type CompleteMultipartUploadResult struct {
	XMLName  xml.Name `xml:"CompleteMultipartUploadResult"`
	Location string   `xml:"Location"`
	Bucket   string   `xml:"Bucket"`
	Key      string   `xml:"Key"`
	ETag     string   `xml:"ETag"`
}

type GCSExternalMediaStore struct {
	httpClient *http.Client
	bucket     string
	projectId  string
	token      string
}

func NewGCSExternalMediaStore(bucket, projectId, token string) *GCSExternalMediaStore {
	var httpClient *http.Client

	if bucket != "" {
		var err error
		httpClient, err = CreateGCSExternalClient(projectId, token)
		if err != nil {
			panic(err)
		}
	}

	return &GCSExternalMediaStore{
		httpClient: httpClient,
		bucket:     bucket,
		projectId:  projectId,
		token:      token,
	}
}

func (w *GCSExternalMediaStore) CreateExternalMediaStream(
	ctx context.Context,
	streamId StreamId,
	data []byte,
) (string, error) {
	// Generate GCS key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)

	var uploadID string
	err := retryWithBackoff(ctx, "CreateMultipartUpload", func() error {
		// Create the initiate multipart upload request
		req, err := w.createInitiateMultipartUploadRequest(ctx, key)
		if err != nil {
			return err
		}

		resp, err := w.httpClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return RiverError(Err_INTERNAL, "initiate multipart upload failed with status", "status", resp.StatusCode, "body", string(body))
		}

		var result InitiateMultipartUploadResult
		if err := xml.NewDecoder(resp.Body).Decode(&result); err != nil {
			return RiverError(Err_INTERNAL, "failed to decode response", "error", err)
		}

		uploadID = result.UploadId
		return nil
	})
	if err != nil {
		return "", RiverError(Err_INTERNAL, "failed to create multipart upload", "error", err)
	}

	return uploadID, nil
}

func (w *GCSExternalMediaStore) UploadPartToExternalMediaStream(
	ctx context.Context,
	streamId StreamId,
	data []byte,
	uploadID string,
	miniblock int64,
) (string, error) {
	// Generate GCS key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)

	var etag string
	err := retryWithBackoff(ctx, "UploadPart", func() error {
		// Create the upload part request
		req, err := w.createUploadPartRequest(ctx, key, uploadID, miniblock, data)
		if err != nil {
			return err
		}

		resp, err := w.httpClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return RiverError(Err_INTERNAL, "upload part failed with status", "status", resp.StatusCode, "body", string(body))
		}

		etag = resp.Header.Get("ETag")
		if etag == "" {
			return RiverError(Err_INTERNAL, "no ETag in response")
		}

		etag = strings.Trim(etag, "\"")
		return nil
	})
	if err != nil {
		return "", RiverError(Err_INTERNAL, "failed to upload part", "error", err)
	}
	return etag, nil
}

func (w *GCSExternalMediaStore) CompleteMediaStreamUpload(
	ctx context.Context,
	streamId StreamId,
	uploadID string,
	etags []Etag,
) error {
	// Generate GCS key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)

	// Convert to []Part for XML
	var parts []Part
	for _, etag := range etags {
		parts = append(parts, Part{
			PartNumber: int64(etag.Miniblock + 1),
			ETag:       etag.Etag,
		})
	}

	err := retryWithBackoff(ctx, "CompleteMultipartUpload", func() error {
		// Create the complete multipart upload request
		req, err := w.createCompleteMultipartUploadRequest(ctx, key, uploadID, parts)
		if err != nil {
			return err
		}

		resp, err := w.httpClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return RiverError(Err_INTERNAL, "complete multipart upload failed with status", "status", resp.StatusCode, "body", string(body))
		}

		var result CompleteMultipartUploadResult
		if err := xml.NewDecoder(resp.Body).Decode(&result); err != nil {
			return RiverError(Err_INTERNAL, "failed to decode response", "error", err)
		}

		return nil
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
func (w *GCSExternalMediaStore) AbortMediaStreamUpload(
	ctx context.Context,
	streamId StreamId,
	uploadID string,
) error {
	// Generate GCS key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)

	err := retryWithBackoff(ctx, "AbortMultipartUpload", func() error {
		// Create the abort multipart upload request
		req, err := w.createAbortMultipartUploadRequest(ctx, key, uploadID)
		if err != nil {
			return err
		}

		resp, err := w.httpClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return RiverError(Err_INTERNAL, "abort multipart upload failed with status", "status", resp.StatusCode, "body", string(body))
		}

		return nil
	})
	if err != nil {
		return RiverError(Err_INTERNAL, "failed to abort multipart upload", "error", err)
	}
	return nil
}

func (w *GCSExternalMediaStore) GetBucket() string {
	return w.bucket
}

func DownloadRangeFromGCSExternalMediaStream(
	ctx context.Context,
	streamId StreamId,
	rangeHeaders []MiniblockRange,
	bucket string,
	client *http.Client,
	token string,
) ([]byte, error) {
	// Generate GCS key: streams/{streamId}
	key := fmt.Sprintf("streams/%x", streamId)

	// Get the range of the entire data to read
	rangeHeader := fmt.Sprintf(
		"bytes=%d-%d",
		rangeHeaders[0].StartInclusive,
		rangeHeaders[len(rangeHeaders)-1].EndInclusive,
	)

	var data []byte
	err := retryWithBackoff(ctx, "GetObject", func() error {
		// Create the get object request
		req, err := createGCSGetObjectRequest(ctx, bucket, key, rangeHeader, token)
		if err != nil {
			return err
		}

		// Download chunk from GCS with range header
		resp, err := client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
			body, _ := io.ReadAll(resp.Body)
			return RiverError(Err_INTERNAL, "get object failed with status", "status", resp.StatusCode, "body", string(body))
		}

		bodyData, err := io.ReadAll(resp.Body)
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

func CreateGCSExternalClient(projectId, token string) (*http.Client, error) {
	// Return a configured HTTP client for GCS
	return &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
		},
	}, nil
}

// Helper methods for creating HTTP requests

func (w *GCSExternalMediaStore) createInitiateMultipartUploadRequest(
	ctx context.Context,
	key string,
) (*http.Request, error) {
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s?uploads", w.bucket, url.QueryEscape(key))

	req, err := http.NewRequestWithContext(ctx, "POST", url, nil)
	if err != nil {
		return nil, err
	}

	// Add metadata headers
	req.Header.Set("x-goog-meta-stream-id", key)
	req.Header.Set("x-goog-meta-created", time.Now().Format(time.RFC3339))

	// Add OAuth 2.0 Bearer token
	if w.token != "" {
		req.Header.Set("Authorization", "Bearer "+w.token)
	}

	return req, nil
}

func (w *GCSExternalMediaStore) createUploadPartRequest(
	ctx context.Context,
	key, uploadID string,
	miniblock int64,
	data []byte,
) (*http.Request, error) {
	query := fmt.Sprintf("uploadId=%s&partNumber=%d", uploadID, miniblock+1)
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s?%s",
		w.bucket, url.QueryEscape(key), query)

	req, err := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(data)))

	// Add OAuth 2.0 Bearer token
	if w.token != "" {
		req.Header.Set("Authorization", "Bearer "+w.token)
	}

	return req, nil
}

func (w *GCSExternalMediaStore) createCompleteMultipartUploadRequest(
	ctx context.Context,
	key, uploadID string,
	parts []Part,
) (*http.Request, error) {
	query := fmt.Sprintf("uploadId=%s", uploadID)
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s?%s",
		w.bucket, url.QueryEscape(key), query)

	// Create XML body
	completeUpload := CompleteMultipartUpload{Parts: parts}
	xmlData, err := xml.Marshal(completeUpload)
	if err != nil {
		return nil, RiverError(Err_INTERNAL, "failed to marshal XML", "error", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(xmlData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/xml")
	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(xmlData)))

	// Add OAuth 2.0 Bearer token
	if w.token != "" {
		req.Header.Set("Authorization", "Bearer "+w.token)
	}

	return req, nil
}

func (w *GCSExternalMediaStore) createAbortMultipartUploadRequest(
	ctx context.Context,
	key, uploadID string,
) (*http.Request, error) {
	query := fmt.Sprintf("uploadId=%s", uploadID)
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s?%s",
		w.bucket, url.QueryEscape(key), query)

	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return nil, err
	}

	// Add OAuth 2.0 Bearer token
	if w.token != "" {
		req.Header.Set("Authorization", "Bearer "+w.token)
	}

	return req, nil
}

func createGCSGetObjectRequest(ctx context.Context, bucket, key, rangeHeader, token string) (*http.Request, error) {
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucket, url.QueryEscape(key))

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	if rangeHeader != "" {
		req.Header.Set("Range", rangeHeader)
	}

	// Add OAuth 2.0 Bearer token
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	return req, nil
}