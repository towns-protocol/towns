package storage

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

// TestStreamMetaDataDB tests writing and reading stream metadata to/from the DB.
func TestStreamMetaDataDB(t *testing.T) {
	var (
		require             = require.New(t)
		params              = setupStreamStorageTest(t)
		streamStore         = params.pgStreamStore
		streamID            = testutils.FakeStreamId(STREAM_MEDIA_BIN)
		s3MultiPartUploadID = "aabbcc"
		etag1, pn1          = "etag1", int32(7)
		etag2, pn2          = "etag2", int32(6)
		etag3, pn3          = "etag3", int32(8)
		writtenMD           = &StreamMetaData{
			S3PartsCount:        1,
			S3PartsSize:         1,
			S3MultiPartUploadID: &s3MultiPartUploadID,
			S3Parts: []*StreamMetaDataS3Part{
				{ByteSize: 12, S3CompletionPart: &S3CompletedPart{ETag: &etag1, PartNumber: &pn1}},
				{ByteSize: 32, S3CompletionPart: &S3CompletedPart{ETag: &etag2, PartNumber: &pn2}},
				{ByteSize: 44, S3CompletionPart: &S3CompletedPart{ETag: &etag3, PartNumber: &pn3}},
			},
			S3MultiPartCompletedEtag: nil,
		}
		ctx = params.ctx
	)

	defer params.pgStreamStore.Close(ctx)

	// write stream metadata
	require.NoError(streamStore.txRunner(
		ctx,
		"CreateStreamStorage",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			sql := streamStore.sqlForStream(
				`INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated, ephemeral, metadata) VALUES ($1, 0, true, false, $2);`,
				streamID,
			)

			_, err := tx.Exec(ctx, sql, streamID, writtenMD)
			return err
		}, nil, ""))

	// read stream metadata and ensure it matches with what was written
	var retrievedMD *StreamMetaData
	require.NoError(streamStore.txRunner(
		ctx,
		"ReadStreamStorage",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			sql := streamStore.sqlForStream(
				`SELECT metadata FROM es WHERE stream_id = $1;`,
				streamID,
			)

			return tx.QueryRow(ctx, sql, streamID).Scan(&retrievedMD)
		},
		nil, ""))

	require.EqualValues(*writtenMD, *retrievedMD)
}
