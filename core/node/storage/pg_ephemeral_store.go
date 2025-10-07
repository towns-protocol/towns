package storage

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"time"

	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
	// MediaStreamExternalDataPartDescriptor describes an individual part of a media stream
	// that is stored in an external data source.
	MediaStreamExternalDataPartDescriptor struct {
		// PartNumber holds the part number of the miniblock.
		// It corresponds with the ChunkIndex of the protobuf media miniblocks chunks by the client.
		PartNumber int32
		// S3Etag holds the ETag of the uploaded part if uploaded to S3.
		// Otherwise, it is empty.
		S3Etag string
		// ByteSize is the actualy size (in bytes) of the part as uploaded to external storage.
		// It is used to decode miniblocks from an external stored object that consists of multiple
		// concatenated parts.
		ByteSize uint64
	}

	// MediaStreamExternalDataDescriptor describes where data is stored if media stream data is store
	// in an external data source.
	MediaStreamExternalDataDescriptor struct {
		// ExternalBackend holds the name of the external backend that is used to store the stream.
		// Either s3 or gcp, or empty when stored in the database.
		ExternalBackend string
		// Bucket holds the S3 or GCP bucket name where the stream is stored in.
		Bucket string
		// ChunkCount holds the number of expected chunks.
		// It is the same as the ChunkCount that is provided in the protobuf media miniblocks chunks by the client.
		// All parts are received when len(Parts) == ChunkCount.
		ChunkCount int32
		// ChunkSize holds the size of each part as specified by the client in the protobuf message.
		ChunkSize uint64
		// S3MultiPartUploadID holds the upload ID of a multipart S3 upload.
		// If a S3 single Put operation was used, this field is empty and ChunkCount is set to 1.
		// If this stream is stored on GCP, this field is empty.
		S3MultiPartUploadID string
		// S3MultiPartCompletedEtag holds the ETag of a completed multipart S3 upload.
		// For objects that are uploaded to GCP or stored in the database, this is empty.
		S3MultiPartCompletedEtag string
		// Parts hold the information required to decode miniblocks from an externally stored object
		// that consists of multiple parts.
		Parts []*MediaStreamExternalDataPartDescriptor
	}
)

// Value implements the driver.Valuer interface, making it writable to the database.
func (md MediaStreamExternalDataDescriptor) Value() (driver.Value, error) {
	// ensure that the Parts are sorted by PartIndex
	slices.SortFunc(md.Parts, func(a, b *MediaStreamExternalDataPartDescriptor) int {
		return int(a.PartNumber - b.PartNumber)
	})

	b, err := json.Marshal(md)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(b), nil
}

// Scan implements the sql.Scanner interface, making it readable from the database.
func (md *MediaStreamExternalDataDescriptor) Scan(src interface{}) error {
	if src == nil {
		return nil
	}

	var (
		cpy MediaStreamExternalDataDescriptor
		err error
	)

	switch srcT := src.(type) {
	case string:
		err = json.Unmarshal([]byte(srcT), &cpy)
	case []byte:
		err = json.Unmarshal(srcT, &cpy)
	case json.RawMessage:
		err = json.Unmarshal(srcT, &cpy)
	default:
		return RiverError(Err_INTERNAL, fmt.Sprintf("cannot scan MiniblockMetaData from unknown type %T", src))
	}

	if err == nil {
		*md = cpy
	}
	return err
}

// UploadedToS3 returns true when all expected parts are uploaded to S3.
// For a media stream consisting of a single chunk this is true when the chunk is uploaded to S3.
// For a media stream consisting of multiple chunks this is true when all chunks are uploaded to S3 and
// the upload can be completed.
func (md *MediaStreamExternalDataDescriptor) UploadedToS3() bool {
	return md != nil && len(md.Parts) == int(md.ChunkCount)
}

// MultiUploadParts returns information of uploaded s3 parts as S3 returned when uploading a part as
// part of a multipart upload. This can be used to complete the multipart upload.
func (md *MediaStreamExternalDataDescriptor) MultiUploadParts() []s3types.CompletedPart {
	if md == nil {
		return nil
	}

	results := make([]s3types.CompletedPart, 0, md.ChunkCount)
	for _, part := range md.Parts {
		results = append(results, s3types.CompletedPart{
			PartNumber: &part.PartNumber,
			ETag:       &part.S3Etag,
		})
	}

	// ensure that the Parts are sorted by PartIndex
	slices.SortFunc(results, func(a, b s3types.CompletedPart) int {
		return int(*a.PartNumber - *b.PartNumber)
	})

	return results
}

func (s *PostgresStreamStore) lockEphemeralStream(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	write bool,
) (
	lastSnapshotMiniblock int64,
	err error,
) {
	if write {
		err = tx.QueryRow(
			ctx,
			"SELECT latest_snapshot_miniblock from es WHERE stream_id = $1 AND ephemeral IS TRUE FOR UPDATE",
			streamId,
		).Scan(&lastSnapshotMiniblock)
	} else {
		err = tx.QueryRow(
			ctx,
			"SELECT latest_snapshot_miniblock from es WHERE stream_id = $1 AND ephemeral IS TRUE FOR SHARE",
			streamId,
		).Scan(&lastSnapshotMiniblock)
	}

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, RiverError(Err_NOT_FOUND, "Ephemeral stream not found", "streamId", streamId)
		}
		return 0, err
	}

	return lastSnapshotMiniblock, nil
}

// CreateEphemeralStreamStorage creates a new ephemeral stream storage with the given stream ID and genesis miniblock.
func (s *PostgresStreamStore) CreateEphemeralStreamStorage(
	ctx context.Context,
	streamId StreamId,
	genesisMiniblock *MiniblockDescriptor,
) error {
	return s.txRunner(
		ctx,
		"CreateEphemeralStreamStorage",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createEphemeralStreamStorageTx(ctx, tx, streamId, genesisMiniblock)
		},
		nil,
		"streamId", streamId,
	)
}

func (s *PostgresStreamStore) createEphemeralStreamStorageTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	genesisMiniblock *MiniblockDescriptor,
) error {
	sql := s.sqlForStream(
		`
			INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated, ephemeral) VALUES ($1, 0, true, true);
			INSERT INTO {{miniblocks}} (stream_id, seq_num, blockdata, snapshot) VALUES ($1, 0, $2, $3);`,
		streamId,
	)

	if _, err := tx.Exec(ctx, sql, streamId, genesisMiniblock.Data, genesisMiniblock.Snapshot); err != nil {
		if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code == pgerrcode.UniqueViolation {
			return WrapRiverError(Err_ALREADY_EXISTS, err).Message("stream already exists")
		}
		return err
	}

	// Add the ephemeral stream to the ephemeral stream monitor
	if s.esm != nil {
		s.esm.onCreated(streamId)
	}

	return nil
}

// ReadEphemeralMiniblockNums returns ephemeral miniblock numbers stream by the given stream ID.
func (s *PostgresStreamStore) ReadEphemeralMiniblockNums(
	ctx context.Context,
	streamId StreamId,
) ([]int, error) {
	var nums []int
	err := s.txRunner(
		ctx,
		"ReadEphemeralMiniblockNums",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) (err error) {
			nums, err = s.readEphemeralMiniblockNumsTx(ctx, tx, streamId)
			return err
		},
		nil,
		"streamId", streamId,
	)
	return nums, err
}

func (s *PostgresStreamStore) readEphemeralMiniblockNumsTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) ([]int, error) {
	if _, err := s.lockEphemeralStream(ctx, tx, streamId, false); err != nil {
		return nil, err
	}

	rows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT seq_num FROM {{miniblocks}} WHERE stream_id = $1 ORDER BY seq_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}

	var nums []int
	var seqNum int
	_, err = pgx.ForEachRow(rows, []any{&seqNum}, func() error {
		nums = append(nums, seqNum)
		return nil
	})
	return nums, err
}

// WriteEphemeralMiniblock adds a miniblock to the ephemeral miniblock store.
func (s *PostgresStreamStore) WriteEphemeralMiniblock(
	ctx context.Context,
	streamId StreamId,
	miniblock *MiniblockDescriptor,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.txRunner(
		ctx,
		"WriteEphemeralMiniblock",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.writeEphemeralMiniblockTx(
				ctx,
				tx,
				streamId,
				miniblock,
			)
		},
		nil,
		"streamId", streamId,
	)
}

func (s *PostgresStreamStore) writeEphemeralMiniblockTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	miniblock *MiniblockDescriptor,
) error {
	// Query to insert a new ephemeral miniblock
	query := s.sqlForStream(
		"INSERT INTO {{miniblocks}} (stream_id, seq_num, blockdata, snapshot) VALUES ($1, $2, $3, $4);",
		streamId,
	)

	// Lock the ephemeral stream to ensure that the stream exists and is ephemeral.
	if _, err := s.lockEphemeralStream(ctx, tx, streamId, true); err != nil {
		// If the given ephemeral stream does not exist, create one by adding an extra query.
		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			query += `INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated, ephemeral) VALUES ($1, 0, true, true);`
		} else {
			return err
		}
	}

	_, err := tx.Exec(ctx, query, streamId, miniblock.Number, miniblock.Data, miniblock.Snapshot)
	if err != nil {
		if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code == pgerrcode.UniqueViolation {
			return WrapRiverError(Err_ALREADY_EXISTS, err).Message("ephemeral miniblock or stream already exists")
		}
		return err
	}

	return nil
}

func (s *PostgresStreamStore) NormalizeEphemeralStream(
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
			genesisMiniblockHash, err = s.normalizeEphemeralStreamTx(ctx, tx, streamId)
			return err
		},
		nil,
		"streamId", streamId,
	)

	return genesisMiniblockHash, err
}

func (s *PostgresStreamStore) normalizeEphemeralStreamTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (common.Hash, error) {
	if _, err := s.lockEphemeralStream(ctx, tx, streamId, true); err != nil {
		// The given stream might be already normalized. In this case, return the genesis miniblock hash.
		return common.Hash{}, err
	}

	// Read the genesis miniblock for the given streeam
	genesisMbData := make([]byte, 0)
	if err := tx.QueryRow(
		ctx,
		s.sqlForStream("SELECT blockdata FROM {{miniblocks}} WHERE stream_id = $1 AND seq_num = 0", streamId),
		streamId,
	).Scan(&genesisMbData); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return common.Hash{}, RiverError(Err_NOT_FOUND, "Genesis miniblock of the given ephemeral stream not found",
				"streamId", streamId)
		}
		return common.Hash{}, err
	}

	var genesisMb Miniblock
	if err := proto.Unmarshal(genesisMbData, &genesisMb); err != nil {
		return common.Hash{}, RiverError(Err_INTERNAL, "Failed to decode genesis miniblock")
	}

	var mediaEvent StreamEvent
	if err := proto.Unmarshal(genesisMb.GetEvents()[0].Event, &mediaEvent); err != nil {
		return common.Hash{}, RiverError(Err_INTERNAL, "Failed to decode stream event from genesis miniblock")
	}

	// The miniblock with 0 number must be the genesis miniblock.
	// The genesis miniblock must have the media inception event.
	inception := mediaEvent.GetMediaPayload().GetInception()

	// Get all non-genesis miniblock numbers of the given stream for further verification.
	rows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT seq_num FROM {{miniblocks}} WHERE stream_id = $1 AND seq_num > 0 ORDER BY seq_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return common.Hash{}, err
	}

	prevNumber := 0
	var seqNum int
	if _, err = pgx.ForEachRow(rows, []any{&seqNum}, func() error {
		if seqNum != prevNumber+1 {
			// There is a gap in sequence numbers
			return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Miniblocks consistency violation").
				Tag("ActualBlockNumber", seqNum).
				Tag("ExpectedBlockNumber", prevNumber+1).
				Tag("streamId", streamId)
		}
		prevNumber = seqNum
		return nil
	}); err != nil {
		return common.Hash{}, err
	}

	// Last miniblock number must be equal to the number of chunks + 1.
	if seqNum != int(inception.GetChunkCount()) {
		return common.Hash{}, RiverError(
			Err_INTERNAL,
			"The ephemeral stream can not be normalized due to missing miniblocks",
		)
	}

	// Remove ephemeral flag from the given stream.
	// Update generation in the minipools table
	if _, err = tx.Exec(
		ctx,
		s.sqlForStream(
			`INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated, ephemeral) 
					VALUES ($1, 0, true, false) ON CONFLICT (stream_id) DO UPDATE SET ephemeral = false;
				 INSERT INTO {{minipools}} (stream_id, generation, slot_num) VALUES ($1, $2, -1);`,
			streamId,
		),
		streamId,
		seqNum+1,
	); err != nil {
		return common.Hash{}, err
	}

	// Delete the ephemeral stream from the ephemeral stream monitor
	s.esm.onSealed(streamId)

	return common.BytesToHash(genesisMb.Header.Hash), nil
}

// IsStreamEphemeral returns true if the stream is ephemeral, false otherwise.
func (s *PostgresStreamStore) IsStreamEphemeral(ctx context.Context, streamId StreamId) (ephemeral bool, err error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	err = s.txRunner(
		ctx,
		"IsStreamEphemeral",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			if err := tx.QueryRow(
				ctx,
				"SELECT ephemeral from es WHERE stream_id = $1",
				streamId,
			).Scan(&ephemeral); err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					return RiverError(Err_NOT_FOUND, "Stream not found", "streamId", streamId)
				}
				return err
			}
			return nil
		},
		nil,
		"streamId", streamId,
	)
	return ephemeral, err
}
