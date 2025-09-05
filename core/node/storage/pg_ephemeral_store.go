package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

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
	location string,
) error {
	return s.txRunner(
		ctx,
		"CreateEphemeralStreamStorage",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createEphemeralStreamStorageTx(ctx, tx, streamId, genesisMiniblock, location)
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
	location string,
) error {
	sql := s.sqlForStream(
		`
			INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated, ephemeral, location) VALUES ($1, 0, true, true, $2);
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
	return
}

func (s *PostgresStreamStore) GetMediaStreamLocation(ctx context.Context, streamId StreamId) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var location string
	err := s.txRunner(
		ctx,
		"GetMediaStreamLocation",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			location, err = s.getMediaStreamLocationTx(
				ctx,
				tx,
				streamId,
			)
			return err
		},
		nil,
		"streamId", streamId,
	)
	return location, err
}

func (s *PostgresStreamStore) getMediaStreamLocationTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (string, error) {
	var location string
	if err := tx.QueryRow(ctx, "SELECT location FROM es WHERE stream_id = $1", streamId).Scan(&location); err != nil {
		return "", err
	}
	return location, nil
}

// Add the media stream data location to the table (for external)
func (s *PostgresStreamStore) CreateExternalMediaStreamUploadEntry(
	ctx context.Context,
	streamId StreamId,
	uploadID string,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.txRunner(
		ctx,
		"WriteMediaStreamInfo",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.CreateExternalMediaStreamUploadEntryTx(
				ctx,
				tx,
				streamId,
				uploadID,
			)
		},
		nil,
		"streamId", streamId,
	)
}

func (s *PostgresStreamStore) CreateExternalMediaStreamUploadEntryTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	uploadID string,
) error {
	query := `
		INSERT INTO external_media_uploads (stream_id, upload_id) 
		VALUES ($1, $2)
	`

	_, err := tx.Exec(ctx, query, streamId, uploadID)
	return err
}

func (s *PostgresStreamStore) WriteExternalMediaStreamPartInfo(
	ctx context.Context,
	streamId StreamId,
	miniblock int64,
	partNumber int,
	etag string,
	length int,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.txRunner(
		ctx,
		"WriteExternalMediaStreamPartInfo",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.WriteExternalMediaStreamPartInfoTx(ctx, tx, streamId, miniblock, partNumber, etag, length)
		},
		nil,
		"streamId", streamId,
	)
}

func (s *PostgresStreamStore) WriteExternalMediaStreamPartInfoTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	miniblock int64,
	partNumber int,
	etag string,
	length int,
) error {
	// First, update the external_media_uploads table with the new etag
	updateUploadQuery := `
		INSERT INTO external_media_uploads (stream_id, etags) 
		VALUES ($1, $2)
		ON CONFLICT (stream_id) 
		DO UPDATE SET etags = external_media_uploads.etags || $2
	`

	// Add the new etag to the JSONB array
	etagJSON := fmt.Sprintf(`[{"part_number": %d, "etag": "%s"}]`, partNumber, etag)
	_, err := tx.Exec(ctx, updateUploadQuery, streamId, etagJSON)
	if err != nil {
		return err
	}

	// Then, insert/update the marker in external_media_markers table
	query := `
		WITH max_end_bytes AS (
			SELECT COALESCE(MAX(end_bytes), 0) as max_end
			FROM external_media_markers 
			WHERE stream_id = $1
		)
		INSERT INTO external_media_markers (stream_id, miniblock, start_bytes, end_bytes) 
		SELECT $1, $2, max_end + 1, max_end + $3
		FROM max_end_bytes
	`
	_, err = tx.Exec(ctx, query, streamId, miniblock, length)
	return err
}

func (s *PostgresStreamStore) GetExternalMediaStreamInfo(
	ctx context.Context,
	streamId StreamId,
) (string, []Etag, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var uploadID string
	var etags []Etag
	err := s.txRunner(
		ctx,
		"GetExternalMediaStreamInfo",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			uploadID, etags, err = s.getExternalMediaStreamInfoTx(ctx, tx, streamId)
			return err
		},
		nil,
		"streamId", streamId,
	)
	return uploadID, etags, err
}

func (s *PostgresStreamStore) getExternalMediaStreamInfoTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (string, []Etag, error) {
	// Get both upload ID and etags in a single query
	var uploadID, etagsJSON string
	err := tx.QueryRow(ctx, `
		SELECT upload_id, etags 
		FROM external_media_uploads 
		WHERE stream_id = $1`, streamId).Scan(&uploadID, &etagsJSON)
	if err != nil {
		return "", nil, err
	}

	// Parse the JSONB array to extract etags
	var etags []Etag

	if etagsJSON != "" && etagsJSON != "[]" {
		err = json.Unmarshal([]byte(etagsJSON), &etags)
		if err != nil {
			return uploadID, nil, err
		}
	}

	// Convert etags to the expected type without struct tags
	etagsNoTags := make([]Etag, len(etags))
	for i, e := range etags {
		etagsNoTags[i] = Etag{
			PartNumber: e.PartNumber,
			Etag:       e.Etag,
		}
	}

	return uploadID, etagsNoTags, nil
}

func (s *PostgresStreamStore) GetExternalMediaStreamNextPart(
	ctx context.Context,
	streamId StreamId,
) (string, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var uploadID string
	var partNumber int
	err := s.txRunner(
		ctx,
		"GetExternalMediaStreamNextPart",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			uploadID, partNumber, err = s.GetExternalMediaStreamNextPartTx(ctx, tx, streamId)
			return err
		},
		nil,
		"streamId", streamId,
	)
	return uploadID, partNumber, err
}

func (s *PostgresStreamStore) GetExternalMediaStreamNextPartTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (string, int, error) {
	var uploadID string
	var partNumber int

	// Atomic increment and return current value
	err := tx.QueryRow(ctx, `
		UPDATE external_media_streams 
		SET parts = parts + 1
		WHERE stream_id = $1
		RETURNING upload_id, parts - 1
	`, streamId).Scan(&uploadID, &partNumber)

	return uploadID, partNumber, err
}

func (s *PostgresStreamStore) GetExternalMediaStreamChunkRangeByMiniblock(
	ctx context.Context,
	miniblock int64,
) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var rangeHeader string
	err := s.txRunner(
		ctx,
		"GetExternalMediaStreamChunkRangeByMiniblock",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			rangeHeader, err = s.getExternalMediaStreamChunkRangeByMiniblockTx(ctx, tx, miniblock)
			return err
		},
		nil,
		"miniblock", miniblock,
	)
	return rangeHeader, err
}

func (s *PostgresStreamStore) getExternalMediaStreamChunkRangeByMiniblockTx(
	ctx context.Context,
	tx pgx.Tx,
	miniblock int64,
) (string, error) {
	var startBytes, endBytes int64
	err := tx.QueryRow(ctx, `
		SELECT start_bytes, end_bytes 
		FROM external_media_chunks 
		WHERE miniblock = $1`,
		miniblock).Scan(&startBytes, &endBytes)
	if err != nil {
		return "", err
	}

	// Construct range header in S3 format: bytes=start-end
	rangeHeader := fmt.Sprintf("bytes=%d-%d", startBytes, endBytes)
	return rangeHeader, nil
}
