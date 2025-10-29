package storage

import (
	"context"
	"database/sql/driver"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	gcstorage "cloud.google.com/go/storage"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsv4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"
	"github.com/prometheus/client_golang/prometheus"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// ExternallyStoredMiniblockDescriptor describes a miniblock that is stored in external storage.
// This information can be used to decode a miniblock from an external object that combines
// multiple miniblocks.
type (
	// externalMediaStreamStorage is a struct that holds the configuration for
	// storing media stream miniblocks in external storage.
	externalMediaStreamStorage struct {
		s3 *struct {
			accessKeyID     string
			secretAccessKey string
			bucket          string
			region          string
			client          *awss3.Client
			httpClient      *http.Client
		}
		gcs *struct {
			bucket     *gcstorage.BucketHandle
			creds      *google.Credentials
			httpClient *http.Client
		}

		// migrationAttemptsCounter is the number of stream migration attempts that succeeded.
		migrationAttemptsSuccessCounter prometheus.Counter
		// migrationAttemptsFailedCounter is the number of stream migration attempts that failed.
		migrationAttemptsFailedCounter prometheus.Counter
		// miniblocksStoredExternal keeps track of how many miniblocks are stored in external storage.
		miniblocksStoredExternalCounter prometheus.Counter
		// googleOauthTokenMu guards googleOauthToken.
		googleOauthTokenMu sync.Mutex
		// googleOauthToken is the token used to authenticate with Google Cloud Storage.
		googleOauthToken *oauth2.Token
	}

	// ExternallyStoredMiniblockDescriptor holds information about a miniblock that is stored in
	// external storage in an object that combines all miniblocks for a stream.
	ExternallyStoredMiniblockDescriptor struct {
		// Number is the miniblock number.
		Number int64
		// StartByte is the byte offset of the miniblock in the combined object.
		StartByte uint64
		// MiniblockDataLength is the length of the miniblock data in the combined object.
		MiniblockDataLength uint64
	}

	// MiniblockDataStorageLocation defines where miniblock.Data is stored.
	MiniblockDataStorageLocation byte

	// ExternalStorageWriter can write chunks of bytes to external storage.
	ExternalStorageWriter interface {
		// WriteMiniblockData writes or schedules the given blockdata to be written to external storage.
		// If WriteMiniblockData returns an error the caller must call Abort to clean up the resources.
		// If all miniblock data was written successfully the caller must call Finish to complete the upload.
		// Only when Finish returns nil the object is considered successfully uploaded.
		WriteMiniblockData(ctx context.Context, mbNum int64, blockdata []byte) error
		// Finish the storage writer session.
		// Only when Finish returned nil the object is considered successfully uploaded.
		Finish(ctx context.Context) ([]ExternallyStoredMiniblockDescriptor, MiniblockDataStorageLocation, error)
		// Abort the storage writer session.
		// If Finish was called before successfully, this is a no-op
		Abort()
	}

	// s3ExternalStorageWriter implements ExternalStorageWriter for S3 storage.
	s3ExternalStorageWriter struct {
		reqCancel           context.CancelFunc
		streamID            StreamId
		s3Storage           io.WriteCloser
		totalMiniblockBytes uint64
		miniblocks          []ExternallyStoredMiniblockDescriptor
		resp                chan struct {
			err  error
			resp *http.Response
		}
	}

	// gcsExternalStorageWriter implements ExternalStorageWriter for GCS storage.
	gcsExternalStorageWriter struct {
		reqCancel           context.CancelFunc
		streamID            StreamId
		gcStorage           io.WriteCloser
		totalMiniblockBytes uint64
		miniblocks          []ExternallyStoredMiniblockDescriptor
		resp                chan struct {
			err  error
			resp *http.Response
		}
	}

	// TestExternalStorage is a helper interface for testing purposes.
	TestExternalStorage interface {
		// TestDeleteExternalObject deletes an external object from the external storage.
		// For testing purposes only.
		TestDeleteExternalObject(ctx context.Context, streamID StreamId, loc MiniblockDataStorageLocation) error

		// TestNormalizeStreamWithoutCallingEphemeralMonitor normalizes the stream but won't call
		// EphemeralMonitor#onSealed afterwards
		TestNormalizeStreamWithoutCallingEphemeralMonitor(
			ctx context.Context, streamID StreamId) (common.Hash, error)
	}
)

var (
	_ ExternalStorageWriter = (*s3ExternalStorageWriter)(nil)
	_ ExternalStorageWriter = (*gcsExternalStorageWriter)(nil)
	_ TestExternalStorage   = (*PostgresStreamStore)(nil)
)

const (
	// MiniblockDataStorageLocationDB indicates that the miniblock data is stored in the database.
	MiniblockDataStorageLocationDB MiniblockDataStorageLocation = 'D'
	// MiniblockDataStorageLocationS3 indicates that the miniblock data is stored in S3.
	MiniblockDataStorageLocationS3 MiniblockDataStorageLocation = 'S'
	// MiniblockDataStorageLocationGCS indicates that the miniblock data is stored in Google Cloud Storage.
	MiniblockDataStorageLocationGCS MiniblockDataStorageLocation = 'G'
	// MinimumExternalStorageUploadPartSize is the minimum size of a part to upload to external storage.
	// This is used to avoid uploading very small parts that can lead to performance issues.
	// The value is set to 5MiB, which is the minimum part size for S3 and GCS.
	// See https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
	// and https://cloud.google.com/storage/quotas#requests
	MinimumExternalStorageUploadPartSize = 5 * 1024 * 1024
	// gcsCredentialScope scopes the derived credential token to Google Cloud Storage API.
	gcsCredentialScope = "https://www.googleapis.com/auth/devstorage.read_write"
)

// MigrationAttemptSuccessful must be called when a stream miniblocks are migrated to external storage.
func (e *externalMediaStreamStorage) MigrationAttemptSuccessful(nMiniblocks int) {
	if c := e.migrationAttemptsSuccessCounter; c != nil {
		c.Inc()
	}
	if c := e.miniblocksStoredExternalCounter; c != nil {
		c.Add(float64(nMiniblocks))
	}
}

// MigrationAttemptFailed must be called when an attempt to migarte stream miniblocks to external
// storage failed.
func (e *externalMediaStreamStorage) MigrationAttemptFailed() {
	if c := e.migrationAttemptsFailedCounter; c != nil {
		c.Inc()
	}
}

// NewGoogleStorageExternalStorageWriter creates a new Google Storage external storage writer.
func NewGoogleStorageExternalStorageWriter(
	streamID StreamId,
	schemaLockID int64,
	bucket string,
	totalMiniblockDataSizeInDB int64,
	token *oauth2.Token,
	httpClient *http.Client,
) (*gcsExternalStorageWriter, error) {
	var (
		reqCtx, reqCancel = context.WithCancel(
			context.Background(),
		) // lint:ignore context.Background() is fine here
		objectKey              = ExternalStorageObjectKey(schemaLockID, streamID)
		url                    = fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucket, objectKey)
		contentLength          = totalMiniblockDataSizeInDB
		bodyReader, bodyWriter = io.Pipe()
	)

	// prepare s3 put object request
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPut, url, bodyReader)
	if err != nil {
		reqCancel()
		_ = bodyWriter.CloseWithError(err)
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"Unable to create Google Storage put object request", err).
			Tag("bucket", bucket).
			Tag("stream", streamID).
			Func("NewGoogleStorageExternalStorageWriter")
	}
	req.ContentLength = contentLength
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Content-Type", "application/protobuf")

	respChan := make(chan struct {
		err  error
		resp *http.Response
	}, 1)

	// execute the request in a background task that streams data written to bodyWriter to GC Storage
	// data is written to bodyWriter in gcsExternalStorageWriter#WriteMiniblockData.
	// the valid response or the error are written to respChan that is read in gcsExternalStorageWriter#Finish.
	// otherwise the response is written to respChan that is read in gcsExternalStorageWriter#Finish.
	go func() {
		defer close(respChan)
		defer reqCancel()

		resp, err := httpClient.Do(req)
		if err != nil {
			_ = bodyWriter.CloseWithError(err)
			respChan <- struct {
				err  error
				resp *http.Response
			}{err: err, resp: nil}
			return
		}

		_ = bodyWriter.Close()
		_ = resp.Body.Close()

		respChan <- struct {
			err  error
			resp *http.Response
		}{err: nil, resp: resp}
	}()

	return &gcsExternalStorageWriter{
		streamID:  streamID,
		reqCancel: reqCancel,
		gcStorage: bodyWriter,
		resp:      respChan,
	}, nil
}

// WriteMiniblockData either writes the given blockdata to the external storage, or schedules it for writing
// when it's not big enough to be written at the moment.
//
// TODO: once appendable objects are out of preview consider using appendable writers to append each miniblock
// to the object instead of doing a plain PUT operation.
// https://pkg.go.dev/cloud.google.com/go/storage#ObjectHandle.NewWriterFromAppendableObject
func (g *gcsExternalStorageWriter) WriteMiniblockData(ctx context.Context, mbNum int64, blockdata []byte) error {
	// try to write blockdata to s3, the background task writes this data to s3.
	if _, err := g.gcStorage.Write(blockdata); err != nil {
		return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to write miniblock to GCS", err).
			Tag("streamId", g.streamID).
			Func("gcsExternalStorageWriter#WriteMiniblockData")
	}

	// store details about individual miniblocks that can be used to decode the miniblock later
	// when all parts are combined into a single external storage object.
	g.miniblocks = append(g.miniblocks, ExternallyStoredMiniblockDescriptor{
		Number:              mbNum,
		StartByte:           g.totalMiniblockBytes,
		MiniblockDataLength: uint64(len(blockdata)),
	})

	// store the total number of miniblock data bytes written to gcs to keep track where one
	// miniblock ends and the new one starts in the gcs object that combines all miniblocks.
	g.totalMiniblockBytes += uint64(len(blockdata))

	return nil
}

// Finish writes pending miniblock data to external storage and returns the parts that are needed
// to decode miniblocks from the object stored in external storage.
func (g *gcsExternalStorageWriter) Finish(ctx context.Context) (
	[]ExternallyStoredMiniblockDescriptor,
	MiniblockDataStorageLocation,
	error,
) {
	// ensure that the background request is always canceled afterward
	defer g.reqCancel()

	// close the writer to gcs, this will finish the background http request
	if err := g.gcStorage.Close(); err != nil {
		return nil, MiniblockDataStorageLocationDB, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"unable to finish writing miniblocks to gcs", err).
			Tag("streamId", g.streamID).
			Func("gcsExternalStorageWriter#Finish")
	}

	// wait until the http request reports the result of the put object request
	result := <-g.resp
	if result.err != nil {
		return nil, MiniblockDataStorageLocationDB, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"gcs put object request failed", result.err).
			Tag("streamId", g.streamID).
			Func("gcsExternalStorageWriter#Finish")
	}

	// http error code 2xx indicates that the request was successful
	if (result.resp.StatusCode / 100) == 2 {
		return g.miniblocks, MiniblockDataStorageLocationGCS, nil
	}

	return nil, MiniblockDataStorageLocationDB, RiverError(Err_DOWNSTREAM_NETWORK_ERROR,
		"gcs put object request failed").
		Tag("streamId", g.streamID).
		Tag("statusCode", result.resp.StatusCode).
		Tag("status", result.resp.Status).
		Func("gcsExternalStorageWriter#Finish")
}

// Abort aborts the upload session and deletes claimed resources.
func (g *gcsExternalStorageWriter) Abort() {
	g.reqCancel()
	_ = g.gcStorage.Close()
}

// NewS3ExternalStorageWriter creates a new S3 external storage writer.
func NewS3ExternalStorageWriter(
	streamID StreamId,
	schemaLockID int64,
	bucket string,
	region string,
	totalMiniblockDataSizeInDB int64,
	awsCredentials aws.Credentials,
	httpClient *http.Client,
) (*s3ExternalStorageWriter, error) {
	var (
		reqCtx, reqCancel = context.WithCancel(
			context.Background(),
		) // lint:ignore context.Background() is fine here
		objectKey              = ExternalStorageObjectKey(schemaLockID, streamID)
		url                    = fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucket, region, objectKey)
		contentLength          = totalMiniblockDataSizeInDB
		signer                 = awsv4.NewSigner()
		timestamp              = time.Now().UTC()
		host                   = fmt.Sprintf("%s.s3.%s.amazonaws.com", bucket, region)
		bodyReader, bodyWriter = io.Pipe()
	)

	// prepare s3 put object request
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPut, url, bodyReader)
	if err != nil {
		reqCancel()
		_ = bodyWriter.CloseWithError(err)
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"Unable to create S3 put object request", err).
			Tag("bucket", bucket).
			Tag("stream", streamID).
			Func("NewS3ExternalStorageWriter")
	}
	req.Host = host
	req.ContentLength = contentLength
	req.Header.Set("Content-Type", "application/protobuf")
	req.Header.Set("X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD")

	// sign http request
	if err := signer.SignHTTP(reqCtx, awsCredentials, req, "UNSIGNED-PAYLOAD", "s3", region, timestamp); err != nil {
		reqCancel()
		_ = bodyWriter.CloseWithError(err)
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"Unable to sign S3 put object request", err).
			Tag("bucket", bucket).
			Tag("stream", streamID).
			Func("NewS3ExternalStorageWriter")
	}

	respChan := make(chan struct {
		err  error
		resp *http.Response
	}, 1)

	// execute the request in a background task that streams data written to bodyWriter to s3
	// data is written to bodyWriter in s3ExternalStorageWriter#WriteMiniblockData.
	// the valid response or the error are written to respChan that is read in s3ExternalStorageWriter#Finish.
	// otherwise the response is written to respChan that is read in s3ExternalStorageWriter#Finish.
	go func() {
		defer close(respChan)
		defer reqCancel()

		resp, err := httpClient.Do(req)
		if err != nil {
			_ = bodyWriter.CloseWithError(err)
			respChan <- struct {
				err  error
				resp *http.Response
			}{err: err, resp: nil}
			return
		}

		_ = bodyWriter.Close()
		_ = resp.Body.Close()

		respChan <- struct {
			err  error
			resp *http.Response
		}{err: nil, resp: resp}
	}()

	return &s3ExternalStorageWriter{
		streamID:  streamID,
		reqCancel: reqCancel,
		s3Storage: bodyWriter,
		resp:      respChan,
	}, nil
}

// WriteMiniblockData writes the miniblock data to S3.
func (s *s3ExternalStorageWriter) WriteMiniblockData(
	_ context.Context,
	mbNum int64,
	blockdata []byte,
) error {
	// try to write blockdata to s3, the background task writes this data to s3.
	if _, err := s.s3Storage.Write(blockdata); err != nil {
		return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to write miniblock to S3", err).
			Tag("streamId", s.streamID).
			Func("s3ExternalStorageWriter#WriteMiniblockData")
	}

	// store details about individual miniblocks that can be used to decode the miniblock later
	// when all parts are combined into a single external storage object.
	s.miniblocks = append(s.miniblocks, ExternallyStoredMiniblockDescriptor{
		Number:              mbNum,
		StartByte:           s.totalMiniblockBytes,
		MiniblockDataLength: uint64(len(blockdata)),
	})

	// store the total number of miniblock data bytes written to s3 to keep track where one
	// miniblock ends and the new one starts in the s3 object that combines all miniblocks.
	s.totalMiniblockBytes += uint64(len(blockdata))

	return nil
}

// Finish closes the body writer to finish writing miniblocks to s3 and returns the parts
// that are needed to reconstruct the miniblock data from the s3 object.
func (s *s3ExternalStorageWriter) Finish(
	context.Context,
) ([]ExternallyStoredMiniblockDescriptor, MiniblockDataStorageLocation, error) {
	// ensure that the background request is always canceled afterward
	defer s.reqCancel()

	// close the writer to s3, this will finish the background http request
	if err := s.s3Storage.Close(); err != nil {
		return nil, MiniblockDataStorageLocationDB, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"unable to finish writing miniblocks to s3", err).
			Tag("streamId", s.streamID).
			Func("s3ExternalStorageWriter#Finish")
	}

	// wait until the http request reports the result of the put object request
	result := <-s.resp
	if result.err != nil {
		return nil, MiniblockDataStorageLocationDB, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"s3 put object request failed", result.err).
			Tag("streamId", s.streamID).
			Func("s3ExternalStorageWriter#Finish")
	}

	// http error code 2xx indicates that the request was successful
	if (result.resp.StatusCode / 100) == 2 {
		return s.miniblocks, MiniblockDataStorageLocationS3, nil
	}

	return nil, MiniblockDataStorageLocationDB, RiverError(Err_DOWNSTREAM_NETWORK_ERROR,
		"s3 put object request failed").
		Tag("streamId", s.streamID).
		Tag("statusCode", result.resp.StatusCode).
		Tag("status", result.resp.Status).
		Func("s3ExternalStorageWriter#Finish")
}

// Abort aborts the upload session.
func (s *s3ExternalStorageWriter) Abort() {
	s.reqCancel()
	_ = s.s3Storage.Close()
}

// Enabled returns true if storing media stream miniblocks in external storage is enabled.
func (e *externalMediaStreamStorage) Enabled() bool {
	return e != nil && (e.gcs != nil || e.s3 != nil)
}

// StartUploadSession initiates an upload session to write miniblock data to external storage.
func (e *externalMediaStreamStorage) StartUploadSession(
	schemaLockID int64,
	streamID StreamId,
	totalMiniblockDataSizeInDB int64,
) (ExternalStorageWriter, error) {
	if schemaLockID < 0 {
		schemaLockID *= -1 // used as prefix for object keys, ensure that it doesn't start with a minus
	}

	if e.gcs != nil {
		var (
			refreshWhenAfter = time.Now().Add(-5 * time.Minute)
			httpClient       = http.DefaultClient
			apiToken         *oauth2.Token
			err              error
		)

		if e.gcs.httpClient != nil {
			httpClient = e.gcs.httpClient
		}

		e.googleOauthTokenMu.Lock()
		if e.googleOauthToken == nil || e.googleOauthToken.Expiry.After(refreshWhenAfter) {
			e.googleOauthToken, err = e.gcs.creds.TokenSource.Token()
			if err != nil {
				e.googleOauthTokenMu.Unlock()
				return nil, RiverError(Err_BAD_CONFIG, "Unable to get GCS oauth token").
					Tag("streamId", streamID).
					Func("externalMediaStreamStorage#StartUploadSession")
			}
		}
		apiToken = e.googleOauthToken
		e.googleOauthTokenMu.Unlock()

		return NewGoogleStorageExternalStorageWriter(
			streamID, schemaLockID, e.gcs.bucket.BucketName(), totalMiniblockDataSizeInDB, apiToken, httpClient)
	}

	if e.s3 != nil {
		creds := aws.Credentials{
			AccessKeyID:     e.s3.accessKeyID,
			SecretAccessKey: e.s3.secretAccessKey,
			Source:          "RiverNode",
		}

		httpClient := http.DefaultClient
		if e.s3.httpClient != nil {
			httpClient = e.s3.httpClient
		}

		return NewS3ExternalStorageWriter(
			streamID, schemaLockID, e.s3.bucket, e.s3.region, totalMiniblockDataSizeInDB, creds, httpClient)
	}

	return nil, RiverError(Err_BAD_CONFIG, "No external media storage configured").
		Tag("streamId", streamID).
		Func("externalMediaStreamStorage#StartUploadSession")
}

// Value implements river.Valuer for MiniblockDataStorageLocation.
func (loc MiniblockDataStorageLocation) Value() (driver.Value, error) {
	return string(loc), nil
}

// Scan implements sql.Scanner for MiniblockDataStorageLocation.
func (loc *MiniblockDataStorageLocation) Scan(src interface{}) error {
	if str, ok := src.(string); ok {
		if len(str) == 0 { // default is DB
			*loc = MiniblockDataStorageLocationDB
			return nil
		}
		if len(str) == 1 {
			*loc = MiniblockDataStorageLocation(str[0])
			return nil
		}
	}

	return RiverError(Err_INTERNAL, "Unable to scan miniblock storage location from DB").
		Func("MiniblockDataStorageLocation.Scan").
		Tags("raw", src, "rawType", fmt.Sprintf("%T", src))
}

// WithCustomS3Client sets the AWS S3 client with the given values.
func WithCustomS3Client(
	accessKeyID string,
	secretAccessKey string,
	bucket string,
	region string,
	client *awss3.Client,
	httpClient *http.Client,
) PostgresStreamStoreOption {
	return func(store *PostgresStreamStore) {
		if store.externalMediaStreamStorage == nil {
			store.externalMediaStreamStorage = &externalMediaStreamStorage{}
		}
		store.externalMediaStreamStorage.s3 = &struct {
			accessKeyID     string
			secretAccessKey string
			bucket          string
			region          string
			client          *awss3.Client
			httpClient      *http.Client
		}{
			accessKeyID:     accessKeyID,
			secretAccessKey: secretAccessKey,
			bucket:          bucket,
			region:          region,
			client:          client,
			httpClient:      httpClient,
		}
	}
}

// WithCustomGcsClient sets the Google Cloud Storage client.
func WithCustomGcsClient(
	bucket *gcstorage.BucketHandle,
	creds *google.Credentials,
	httpClient *http.Client,
) PostgresStreamStoreOption {
	return func(store *PostgresStreamStore) {
		if store.externalMediaStreamStorage == nil {
			store.externalMediaStreamStorage = &externalMediaStreamStorage{}
		}
		store.externalMediaStreamStorage.gcs = &struct {
			bucket     *gcstorage.BucketHandle
			creds      *google.Credentials
			httpClient *http.Client
		}{bucket: bucket, creds: creds, httpClient: httpClient}
	}
}

// ExternalStorageEnabled returns true if external storage is enabled for the stream store.
func (s *PostgresStreamStore) ExternalStorageEnabled() bool {
	return s.externalMediaStreamStorage.Enabled()
}

// MigrateMiniblocksToExternalStorage migrates miniblocks from
// the given non-ephemeral stream to the external storage.
// It returns an indication if the migration should be retried if it failed.
func (s *PostgresStreamStore) MigrateMiniblocksToExternalStorage(
	ctx context.Context,
	streamID StreamId,
) (retry bool, err error) {
	if !s.ExternalStorageEnabled() {
		return false, RiverError(Err_BAD_CONFIG, "external media stream storage is not enabled").
			Tag("streamId", streamID).
			Func("MigrateMiniblocksToExternalStorage")
	}

	// only support external miniblock storage for media streams
	if streamID.Type() != STREAM_MEDIA_BIN {
		return false, nil
	}

	// ensure that all miniblocks/chunks are available in the DB
	// media streams are non-ephemeral once all miniblocks are stored in the DB.
	isEphemeral, err := s.IsStreamEphemeral(ctx, streamID)
	if err != nil {
		return true, err
	}
	if isEphemeral {
		return false, RiverError(Err_INTERNAL,
			"unable to migrate miniblocks to external store, stream is ephemeral").
			Tags("streamId", streamID).
			Func("MigrateMiniblocksToExternalStorage")
	}

	totalMiniblockDataSizeInDB, err := s.TotalMiniblockDataSizeInDB(ctx, streamID)
	if err != nil {
		return true, err
	}

	if totalMiniblockDataSizeInDB == 0 {
		return false, RiverError(Err_MINIBLOCKS_NOT_FOUND,
			"unable to migrate miniblocks to external store, stream has no miniblock data in DB").
			Tags("streamId", streamID).
			Func("MigrateMiniblocksToExternalStorage")
	}

	uploadSession, err := s.externalMediaStreamStorage.StartUploadSession(
		s.computeLockIdFromSchema(), streamID, totalMiniblockDataSizeInDB)
	if err != nil {
		s.externalMediaStreamStorage.MigrationAttemptFailed()
		return true, err
	}
	defer uploadSession.Abort()

	if err := s.ReadMiniblocksByStream(ctx, streamID, true, func(blockdata []byte, seqNum int64, _ []byte) error {
		return uploadSession.WriteMiniblockData(ctx, seqNum, blockdata)
	}); err != nil {
		s.externalMediaStreamStorage.MigrationAttemptFailed()
		return true, err
	}

	miniblocks, extStorageLoc, err := uploadSession.Finish(ctx)
	if err != nil {
		s.externalMediaStreamStorage.MigrationAttemptFailed()
		return true, err
	}

	// store the metadata about the combined object in the DB so it can be used to decoded
	// miniblocks from the external storage object that combined all miniblocks.
	// Drop the miniblock data from to free up expensive storage and finish the migration.
	if err := s.WriteMediaStreamExternalStorageParts(ctx, streamID, extStorageLoc, miniblocks); err != nil {
		s.externalMediaStreamStorage.MigrationAttemptFailed()
		return true, err
	}

	// update metrics
	s.externalMediaStreamStorage.MigrationAttemptSuccessful(len(miniblocks))

	return false, nil
}

// ExternalStorageObjectKey returns the object key where the miniblocks for the given
// streamID are stored in external storage.
func ExternalStorageObjectKey(id int64, streamID StreamId) string {
	if id < 0 {
		id *= -1 // ensure that object key doesn't start with a minus
	}
	return fmt.Sprintf("%d/%s", id, streamID)
}

// WriteMediaStreamExternalStorageParts writes the given parts to the DB and removes the
// miniblock data from the DB. This function must be called after all miniblock data for a
// media stream has been written to an external storage and can be purged from the DB.
func (s *PostgresStreamStore) WriteMediaStreamExternalStorageParts(
	ctx context.Context,
	streamID StreamId,
	extStorageLoc MiniblockDataStorageLocation,
	parts []ExternallyStoredMiniblockDescriptor,
) error {
	if streamID.Type() != STREAM_MEDIA_BIN {
		return RiverError(Err_INTERNAL, "unable to migrate miniblocks to external store, stream is not a media stream").
			Tag("streamId", streamID).
			Func("WriteMediaStreamExternalStorageDetails")
	}

	err := s.txRunner(
		ctx,
		"WriteMediaStreamExternalStorageDetails",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.writeMediaStreamExternalStoragePartsTx(ctx, tx, streamID, extStorageLoc, parts)
		},
		nil,
		"streamId", streamID,
	)

	return err
}

// readMiniblockDataFromExternalStorage reads all miniblock data from external storage and returns
// a mapping from the miniblock number to the miniblock data on success.
func (s *PostgresStreamStore) readMiniblockDataFromExternalStorage(
	ctx context.Context,
	location MiniblockDataStorageLocation,
	streamID StreamId,
	objectMiniblockParts []ExternallyStoredMiniblockDescriptor,
	fromInclusive int64,
	toExclusive int64,
) (map[int64][]byte, error) {
	if !s.ExternalStorageEnabled() {
		return nil, RiverError(Err_BAD_CONFIG, "external media stream storage is not enabled").
			Tag("streamId", streamID).
			Func("readMiniblockDataFromExternalStorage")
	}

	if location == MiniblockDataStorageLocationGCS {
		return s.readMiniblockDataFromGCS(ctx, objectMiniblockParts, streamID, fromInclusive, toExclusive)
	} else if location == MiniblockDataStorageLocationS3 {
		return s.readMiniblockDataFromS3(ctx, objectMiniblockParts, streamID, fromInclusive, toExclusive)
	}

	return nil, RiverError(Err_BAD_CONFIG, "stream miniblock data is stored in DB").
		Tag("streamId", streamID).
		Func("readMiniblockDataFromExternalStorage")
}

func (s *PostgresStreamStore) writeMediaStreamExternalStoragePartsTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID StreamId,
	extStorageLoc MiniblockDataStorageLocation,
	parts []ExternallyStoredMiniblockDescriptor,
) error {
	_, location, err := s.lockStream(ctx, tx, streamID, true)
	if err != nil {
		return err
	}

	if location != MiniblockDataStorageLocationDB {
		return RiverError(Err_INTERNAL, "stream miniblock data is already stored in external storage").
			Tag("streamId", streamID).
			Tag("location", location).
			Func("writeMediaStreamExternalStoragePartsTx")
	}

	// drop miniblock records from miniblock regular now the miniblock data is uploaded to external storage
	q := s.sqlForStream(`DELETE FROM {{miniblocks}} WHERE stream_id = $1;`, streamID, location)
	// update the stream record with the new external storage location
	q += s.sqlForStream(`UPDATE es SET blockdata_ext = $2 WHERE stream_id = $1;`, streamID, location)

	if _, err := tx.Exec(ctx, q, streamID, extStorageLoc); err != nil {
		return RiverErrorWithBase(
			Err_INTERNAL,
			"Unable to update DB after miniblock data was migrated to ext storage",
			err,
		).
			Tag("streamId", streamID).
			Func("writeMediaStreamExternalStoragePartsTx")
	}

	// import parts in miniblocks external storage table
	if _, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{s.sqlForStream("{{miniblocks}}", streamID, extStorageLoc)},
		[]string{"stream_id", "seq_num", "start_byte", "size"},
		pgx.CopyFromSlice(len(parts), func(i int) ([]any, error) {
			part := parts[i]
			return []any{streamID, part.Number, part.StartByte, part.MiniblockDataLength}, nil
		}),
	); err != nil {
		return RiverErrorWithBase(Err_INTERNAL, "Unable to write miniblock ext storage parts", err).
			Tag("streamId", streamID).
			Func("writeMediaStreamExternalStoragePartsTx")
	}

	return nil
}

// readMediaStreamExternalStoragePartsTx reads miniblock data storage location parts.
// Must be called with a lock on the es stream record.
func (s *PostgresStreamStore) readMediaStreamExternalStoragePartsTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID StreamId,
	miniblockLocation MiniblockDataStorageLocation,
) ([]ExternallyStoredMiniblockDescriptor, error) {
	query := s.sqlForStream(
		`SELECT seq_num, start_byte, size FROM {{miniblocks}} WHERE stream_id = $1 ORDER BY seq_num;`,
		streamID,
		miniblockLocation,
	)

	partsRows, err := tx.Query(ctx, query, streamID)
	if err != nil {
		return nil, err
	}
	defer partsRows.Close()

	var (
		parts     []ExternallyStoredMiniblockDescriptor
		startByte uint64
		seqNum    int64
		size      uint64
	)
	if _, err = pgx.ForEachRow(partsRows, []any{&seqNum, &startByte, &size}, func() error {
		parts = append(parts, ExternallyStoredMiniblockDescriptor{
			Number:              seqNum,
			StartByte:           startByte,
			MiniblockDataLength: size,
		})
		return nil
	}); err != nil {
		return nil, err
	}

	return parts, nil
}

// StreamMiniblocksStoredLocation returns the location where miniblock data is stored.
func (s *PostgresStreamStore) StreamMiniblocksStoredLocation(
	ctx context.Context,
	streamID StreamId,
) (location MiniblockDataStorageLocation, err error) {
	if streamID.Type() != STREAM_MEDIA_BIN {
		return MiniblockDataStorageLocationDB, nil
	}

	err = s.txRunner(
		ctx,
		"StreamMiniblocksExternallyStored",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			_, location, err = s.lockStream(ctx, tx, streamID, false)
			return err
		},
		nil,
		"streamId", streamID,
	)

	return location, err
}

// LoadMediaStreamsWithMiniblocksReadyToMigrate loads up to limit normalized media streams that
// have their miniblock data stored in the database but are ready to migrate these miniblock to
// external storage. If the returned streams slice is less than limit, it means that there are no
// more streams to load. Limit must be between 1 and 2500.
func (s *PostgresStreamStore) LoadMediaStreamsWithMiniblocksReadyToMigrate(
	ctx context.Context,
	limit uint,
) (streams []StreamId, err error) {
	if limit == 0 || limit > 2500 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "limit must be between 1 and 250").
			Tag("limit", limit).
			Func("LoadMediaStreamsWithMiniblocksInDB")
	}

	if err := s.txRunner(
		ctx,
		"LoadMediaStreamsWithMiniblocksReadyToMigrate",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			streams, err = s.loadMediaStreamsWithMiniblocksReadyToMigrateTx(ctx, tx, limit)
			return err
		},
		nil,
	); err != nil {
		return nil, err
	}

	return streams, nil
}

func (s *PostgresStreamStore) loadMediaStreamsWithMiniblocksReadyToMigrateTx(
	ctx context.Context,
	tx pgx.Tx,
	limit uint,
) ([]StreamId, error) {
	query := `SELECT stream_id, blockdata_ext FROM es WHERE ephemeral = false AND stream_id LIKE 'ff%' AND COALESCE(blockdata_ext, 'D') = 'D' LIMIT $1`
	rows, err := tx.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var (
		streamID StreamId
		streams  = make([]StreamId, 0, limit)
		loc      MiniblockDataStorageLocation
	)
	if _, err = pgx.ForEachRow(rows, []any{&streamID, &loc}, func() error {
		streams = append(streams, streamID)
		return nil
	}); err != nil {
		return nil, err
	}

	return streams, nil
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
	allObjectMiniblockParts []ExternallyStoredMiniblockDescriptor,
	fromInclusive int64,
	toExclusive int64,
) (offset int64, size int64, rangeParts []ExternallyStoredMiniblockDescriptor, err error) {
	foundFirstPart := false
	foundLastPart := false

	for _, p := range allObjectMiniblockParts {
		partAlreadyAdded := false

		if !foundFirstPart {
			foundFirstPart = p.Number == fromInclusive
			if foundFirstPart {
				offset = int64(p.StartByte)
				rangeParts = append(rangeParts, ExternallyStoredMiniblockDescriptor{
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
				rangeParts = append(rangeParts, ExternallyStoredMiniblockDescriptor{
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

// TestDeleteExternalObject is a helper function to clean up after unittests.
// It must not be called from production code.
func (s *PostgresStreamStore) TestDeleteExternalObject(
	ctx context.Context,
	streamID StreamId,
	loc MiniblockDataStorageLocation,
) error {
	if loc == MiniblockDataStorageLocationS3 {
		_, err := s.externalMediaStreamStorage.s3.client.DeleteObject(ctx, &awss3.DeleteObjectInput{
			Bucket: aws.String(s.externalMediaStreamStorage.s3.bucket),
			Key:    aws.String(ExternalStorageObjectKey(s.computeLockIdFromSchema(), streamID)),
		})
		return err
	}
	if loc == MiniblockDataStorageLocationGCS {
		return s.externalMediaStreamStorage.gcs.bucket.
			Object(ExternalStorageObjectKey(s.computeLockIdFromSchema(), streamID)).
			Delete(ctx)
	}

	return RiverError(Err_INTERNAL, "Storage location isn't external").Func("TestDeleteExternalObject")
}

func (s *PostgresStreamStore) TestNormalizeStreamWithoutCallingEphemeralMonitor(
	ctx context.Context,
	streamId StreamId,
) (common.Hash, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var genesisMiniblockHash common.Hash

	err := s.txRunner(
		ctx,
		"NormalizeEphemeralStream",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			genesisMiniblockHash, err = s.normalizeEphemeralStreamTx(ctx, tx, streamId, false)
			return err
		},
		nil,
		"streamId", streamId,
	)

	return genesisMiniblockHash, err
}
