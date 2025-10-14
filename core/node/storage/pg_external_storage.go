package storage

import (
	"bytes"
	"context"
	"database/sql/driver"
	"fmt"

	gcpstorage "cloud.google.com/go/storage"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/jackc/pgx/v5"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// externallyStoredMiniblockDescriptor describes a miniblock that is stored in external storage.
// This information can be used to decode a miniblock from an external object that combines
// multiple miniblocks.
type (
	externallyStoredMiniblockDescriptor struct {
		// Number is the miniblock number.
		Number int64
		// StartByte is the byte offset of the miniblock in the combined object.
		StartByte uint64
		// MiniblockDataLength is the length of the miniblock data in the combined object.
		MiniblockDataLength uint64
		// Bucket where the miniblock data is stored.
		Bucket string
	}

	// MiniblockDataStorageLocation defines where miniblock.Data is stored.
	MiniblockDataStorageLocation byte
)

const (
	// MiniblockDataStorageLocationDB indicates that the miniblock data is stored in the database.
	MiniblockDataStorageLocationDB MiniblockDataStorageLocation = 'D'
	// MiniblockDataStorageLocationS3 indicates that the miniblock data is stored in S3.
	MiniblockDataStorageLocationS3 MiniblockDataStorageLocation = 'S'
	// MiniblockDataStorageLocationGCS indicates that the miniblock data is stored in Google Cloud Storage.
	MiniblockDataStorageLocationGCS MiniblockDataStorageLocation = 'G'
)

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

// WithCustomS3Client sets the AWS S3 client.
func WithCustomS3Client(client *s3.Client, bucket string) PostgresStreamStoreOption {
	return func(store *PostgresStreamStore) {
		if store.externalMediaStreamStorage == nil {
			store.externalMediaStreamStorage = &externalMediaStreamStorage{}
		}
		store.externalMediaStreamStorage.s3 = &struct {
			client *s3.Client
			bucket string
		}{client: client, bucket: bucket}
	}
}

// WithCustomGcsClient sets the Google Cloud Storage client.
func WithCustomGcsClient(bucket *gcpstorage.BucketHandle) PostgresStreamStoreOption {
	return func(store *PostgresStreamStore) {
		if store.externalMediaStreamStorage == nil {
			store.externalMediaStreamStorage = &externalMediaStreamStorage{}
		}
		store.externalMediaStreamStorage.gcs = &struct{ bucket *gcpstorage.BucketHandle }{bucket: bucket}
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
		return false, RiverError(Err_INTERNAL, "unable to migrate miniblocks to external store, stream is ephemeral").
			Tags("streamId", streamID).
			Func("MigrateMiniblocksToExternalStorage")
	}

	// combine miniblocks into a single object and keep track of parts to decode individual miniblocks
	// from single object later
	var (
		combinedMiniblocksData = new(bytes.Buffer)
		miniblocksTotalLength  = uint64(0)
		parts                  []externallyStoredMiniblockDescriptor
	)

	if err := s.ReadMiniblocksByStream(ctx, streamID, true, func(blockdata []byte, seqNum int64, snapshot []byte) error {
		_, err := combinedMiniblocksData.Write(blockdata)

		parts = append(parts, externallyStoredMiniblockDescriptor{
			Number:              seqNum,
			StartByte:           miniblocksTotalLength,
			MiniblockDataLength: uint64(len(blockdata)),
		})

		miniblocksTotalLength += uint64(len(blockdata))

		return err
	}); err != nil {
		return true, err
	}

	objectKey := s.ExternalStorageObjectKey(streamID)

	// write the combined miniblock object to external storage
	extStorageLoc, bucket, err := s.externalMediaStreamStorage.Write(ctx, streamID, objectKey, combinedMiniblocksData)
	if err != nil {
		return true, err
	}

	// store the metadata about the combined object in the DB so it can be decoded in the future
	// and drop the miniblock data from the DB finishing migrating the streams miniblocks to
	// external storage.
	if err := s.WriteMediaStreamExternalStorageParts(ctx, streamID, extStorageLoc, bucket, parts); err != nil {
		return true, err
	}

	return false, nil
}

// ExternalStorageObjectKey returns the object key where the miniblocks for the given
// streamID are stored in external storage.
func (s *PostgresStreamStore) ExternalStorageObjectKey(streamID StreamId) string {
	id := s.computeLockIdFromSchema()
	if id < 0 {
		id *= -1
	}
	return fmt.Sprintf("%d/%s", id, streamID.String())
}

// WriteMediaStreamExternalStorageParts writes the given parts to the DB and removes the
// miniblock data from the DB. This function must be called after all miniblock data for a
// media stream has been written to an external storage and can be purged from the DB.
func (s *PostgresStreamStore) WriteMediaStreamExternalStorageParts(
	ctx context.Context,
	streamID StreamId,
	extStorageLoc MiniblockDataStorageLocation,
	bucket string,
	parts []externallyStoredMiniblockDescriptor,
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
			return s.writeMediaStreamExternalStoragePartsTx(ctx, tx, streamID, extStorageLoc, bucket, parts)
		},
		nil,
		"streamId", streamID,
	)

	return err
}

func (s *PostgresStreamStore) writeMediaStreamExternalStoragePartsTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID StreamId,
	extStorageLoc MiniblockDataStorageLocation,
	bucket string,
	parts []externallyStoredMiniblockDescriptor,
) error {
	if _, _, err := s.lockStream(ctx, tx, streamID, true); err != nil {
		return err
	}

	// delete any previous parts for this stream
	q := s.sqlForStream(`DELETE FROM {{miniblocks_ext_storage}} WHERE stream_id = $1;`, streamID)
	// drop miniblock data from DB now they are uploaded to external storage
	q += s.sqlForStream(`UPDATE {{miniblocks}} SET blockdata = NULL WHERE stream_id = $1;`, streamID)
	// update the stream record with the new external storage location
	q += s.sqlForStream(`UPDATE es SET blockdata_ext = $2 WHERE stream_id = $1;`, streamID)

	if _, err := tx.Exec(ctx, q, streamID, extStorageLoc); err != nil {
		return RiverErrorWithBase(
			Err_INTERNAL,
			"Unable to update DB after miniblock data was migrated to ext storage",
			err,
		).
			Tag("streamId", streamID).
			Func("writeMediaStreamExternalStoragePartsTx")
	}

	// import parts in DB
	_, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{s.sqlForStream("{{miniblocks_ext_storage}}", streamID)},
		[]string{"stream_id", "seq_num", "start_byte", "size", "bucket"},
		pgx.CopyFromSlice(len(parts), func(i int) ([]any, error) {
			part := parts[i]
			return []any{streamID, part.Number, part.StartByte, part.MiniblockDataLength, bucket}, nil
		}),
	)
	if err != nil {
		return err
	}

	return nil
}

// readMediaStreamExternalStoragePartsTx reads miniblock data storage location parts.
// Must be called with a lock on the es stream record.
func (s *PostgresStreamStore) readMediaStreamExternalStoragePartsTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID StreamId,
) ([]externallyStoredMiniblockDescriptor, error) {
	query := s.sqlForStream(
		`SELECT seq_num, start_byte, size, bucket FROM {{miniblocks_ext_storage}} WHERE stream_id = $1 ORDER BY seq_num;`,
		streamID,
	)

	partsRows, err := tx.Query(ctx, query, streamID)
	if err != nil {
		return nil, err
	}

	var (
		parts     []externallyStoredMiniblockDescriptor
		startByte uint64
		seqNum    int64
		size      uint64
		bucket    string
	)
	if _, err = pgx.ForEachRow(partsRows, []any{&seqNum, &startByte, &size, &bucket}, func() error {
		parts = append(parts, externallyStoredMiniblockDescriptor{
			Number:              seqNum,
			StartByte:           startByte,
			MiniblockDataLength: size,
			Bucket:              bucket,
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
