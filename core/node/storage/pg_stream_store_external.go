package storage

import (
	"context"
	"errors"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage/external"
)

// ExternalStorageEnabled returns true if external storage is enabled for the stream store.
func (s *PostgresStreamStore) ExternalStorageEnabled() bool {
	return s.externalStorage != nil
}

// MigrateMiniblocksToExternalStorage migrates miniblock data from the given stream to external
// storage. In case it fails, it returns an indication if the migration can be retried. The stream
// must be a media stream that has been normalized (e.g. not ephemeral), and thus no more miniblocks
// can be added to the stream.
//
// When all miniblocks are migrated to external storage, the stream is locked in the DB and the
// miniblock data location is updated to external storage. The miniblocks are purged from the
// {{miniblocks}} table, and records in the {{miniblocks_ext}} table are created and are used
// to decode individual miniblocks from the external object. Once this is done the stream is
// migrated to external storage.
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

	// ensure that all miniblocks/chunks are available in the DB. Media streams become non-ephemeral
	// once all miniblocks are stored in the DB and the stream is sealed.
	isEphemeral, err := s.IsStreamEphemeral(ctx, streamID)
	if err != nil {
		s.extStorageMigrationFailure.Inc()
		return true, err
	}
	if isEphemeral {
		return false, RiverError(Err_INTERNAL,
			"unable to migrate miniblocks to external store, stream is ephemeral").
			Tags("streamId", streamID).
			Func("MigrateMiniblocksToExternalStorage")
	}

	// required to set the content-length in the upload request
	totalMiniblockDataSizeInDB, err := s.TotalMiniblockDataSizeInDB(ctx, streamID)
	if err != nil {
		s.extStorageMigrationFailure.Inc()
		return true, err
	}

	if totalMiniblockDataSizeInDB == 0 {
		return false, RiverError(Err_MINIBLOCKS_NOT_FOUND,
			"unable to migrate miniblocks to external store, stream has no miniblock data in DB").
			Tags("streamId", streamID).
			Func("MigrateMiniblocksToExternalStorage")
	}

	lastMiniblockNumber, err := s.GetLastMiniblockNumber(ctx, streamID)
	if err != nil {
		s.extStorageMigrationFailure.Inc()
		return true, err
	}

	// Track upload duration
	uploadStartTime := time.Now()

	uploadSession, err := s.externalStorage.StartUploadSession(ctx, streamID, totalMiniblockDataSizeInDB)
	if err != nil {
		s.extStorageMigrationFailure.Inc()
		return true, err
	}
	defer uploadSession.Abort() // this is a no-op after finish was called on success

	// fetch miniblocks in batches of pageSize from DB and write them one by one to external storage.
	const pageSize = int64(10)
	for fromIncl := int64(0); fromIncl <= lastMiniblockNumber; fromIncl += pageSize {
		// limit the number of miniblocks read from DB to pageSize
		toExcl := min(fromIncl+pageSize, lastMiniblockNumber+1)

		// read from DB
		miniblocks, _, err := s.ReadMiniblocks(ctx, streamID, fromIncl, toExcl, true)
		if err != nil {
			s.extStorageMigrationFailure.Inc()
			return true, err
		}

		// write to external storage
		for _, miniblock := range miniblocks {
			if err := uploadSession.WriteMiniblockData(ctx, miniblock.Number, miniblock.Data); err != nil {
				s.extStorageMigrationFailure.Inc()
				return true, err
			}
		}
	}

	// finish the upload session and get the combined parts descriptors that describe the object in
	// external storage that combined all individual miniblocks.
	// If this succeeds while writing parts + location to DB the object in external storage will be
	// overwritten the next time the stream is migrated.
	parts, location, err := uploadSession.Finish(ctx)
	if err != nil {
		s.extStorageMigrationFailure.Inc()
		return true, err
	}

	// Record upload duration after successful completion
	s.extStorageUploadDuration.Observe(time.Since(uploadStartTime).Seconds())

	// store the object parts in the DB so they can be used to later decode the object into individual miniblocks.
	// if this fails the object in external storage is overwritten the next time the stream is migrated and
	// the parts are written to DB again.
	if err := s.WriteExternalStorageObjectPartsAndPurgeMiniblockData(ctx, streamID, location, parts); err != nil {
		s.extStorageMigrationFailure.Inc()
		return true, err
	}

	// Record successful migration metrics
	s.extStorageMigrationSuccess.Inc()
	s.extStorageMigrationBytes.Add(float64(totalMiniblockDataSizeInDB))

	return false, nil
}

// TotalMiniblockDataSizeInDB returns the total size of all miniblock data in the DB for the given
// stream. It can be 0 when miniblock data is stored in external storage.
func (s *PostgresStreamStore) TotalMiniblockDataSizeInDB(
	ctx context.Context,
	streamId StreamId,
) (totalSize uint64, err error) {
	err = s.txRunner(
		ctx,
		"TotalMiniblockDataSizeInDB",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			if err := tx.QueryRow(
				ctx,
				s.sqlForStream("SELECT COALESCE(SUM(LENGTH(blockdata)), 0) from {{miniblocks}} WHERE stream_id = $1", streamId),
				streamId,
			).Scan(&totalSize); err != nil {
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

	return totalSize, err
}

// WriteExternalStorageObjectPartsAndPurgeMiniblockData writes the given parts to the DB and removes
// the miniblock data from the DB. This function must be called after all miniblock data for a stream
// have been written to an external storage and can be purged from the DB.
func (s *PostgresStreamStore) WriteExternalStorageObjectPartsAndPurgeMiniblockData(
	ctx context.Context,
	streamID StreamId,
	location external.MiniblockDataStorageLocation,
	parts []external.MiniblockDescriptor,
) error {
	if streamID.Type() != STREAM_MEDIA_BIN {
		return RiverError(Err_INTERNAL, "unable to migrate miniblocks to external store, stream is not a media stream").
			Tag("streamId", streamID).
			Func("WriteExternalStorageObjectPartsAndPurgeMiniblockData")
	}

	err := s.txRunner(
		ctx,
		"WriteExternalStorageObjectPartsAndPurgeMiniblockData",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.writeExternalStorageObjectPartsAndPurgeMiniblockDataTx(ctx, tx, streamID, location, parts)
		},
		nil,
		"streamId", streamID,
	)

	return err
}

func (s *PostgresStreamStore) writeExternalStorageObjectPartsAndPurgeMiniblockDataTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID StreamId,
	extStorageLoc external.MiniblockDataStorageLocation,
	parts []external.MiniblockDescriptor,
) error {
	lockStreamResult, err := s.lockStream(ctx, tx, streamID, true)
	if err != nil {
		return err
	}

	if lockStreamResult.MiniblockDataLocation != external.MiniblockDataStorageLocationDB {
		return RiverError(Err_INTERNAL, "stream miniblock data is already stored in external storage").
			Tag("streamId", streamID).
			Tag("location", lockStreamResult.MiniblockDataLocation).
			Func("writeExternalStorageObjectPartsAndPurgeMiniblockDataTx")
	}

	// Verify that the number of parts matches the number of miniblocks in the DB. This is invariant.
	// This ensures that no more miniblocks are written after the parts are created that could lead
	// to miniblock data loss.
	maxSeqNum := int64(0)
	if err := tx.QueryRow(
		ctx,
		s.sqlForStream(`SELECT MAX(seq_num) FROM {{miniblocks}} WHERE stream_id = $1;`, streamID),
		streamID,
	).Scan(&maxSeqNum); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return RiverError(Err_INTERNAL, "Stream exists in es table, but no miniblocks in DB")
		}
		return err
	}

	if maxSeqNum+1 != int64(len(parts)) {
		return RiverError(Err_INTERNAL, "Stream miniblock count in DB does not match parts count").
			Tag("streamId", streamID).
			Tag("partsCount", len(parts)).
			Tag("maxSeqNum", maxSeqNum).
			Func("writeExternalStorageObjectPartsAndPurgeMiniblockDataTx")
	}

	// drop miniblock records from normal miniblock table now the miniblock data is written to external storage
	q := s.sqlForStream(`DELETE FROM {{miniblocks}} WHERE stream_id = $1;`, streamID)
	// update the stream record with the new external storage location
	q += s.sqlForStream(`UPDATE es SET blockdata_ext = $2 WHERE stream_id = $1;`, streamID)

	if _, err := tx.Exec(ctx, q, streamID, extStorageLoc); err != nil {
		return RiverErrorWithBase(
			Err_INTERNAL,
			"Unable to update DB after miniblock data was migrated to ext storage",
			err,
		).
			Tag("streamId", streamID).
			Func("writeExternalStorageObjectPartsAndPurgeMiniblockDataTx")
	}

	// import parts in miniblocks external storage table
	if _, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{s.sqlForStream("{{miniblocks_ext}}", streamID)},
		[]string{"stream_id", "seq_num", "start_byte", "size"},
		pgx.CopyFromSlice(len(parts), func(i int) ([]any, error) {
			part := parts[i]
			return []any{streamID, part.Number, part.StartByte, part.MiniblockDataLength}, nil
		}),
	); err != nil {
		return RiverErrorWithBase(Err_INTERNAL, "Unable to write miniblock ext storage parts", err).
			Tag("streamId", streamID).
			Func("writeExternalStorageObjectPartsAndPurgeMiniblockDataTx")
	}

	return nil
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
		return nil, RiverError(Err_INVALID_ARGUMENT, "limit must be between 1 and 2500").
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
	query := `SELECT stream_id FROM es WHERE ephemeral = false AND stream_id LIKE '` + STREAM_MEDIA_PREFIX + `%' AND COALESCE(blockdata_ext, 'D') = 'D' LIMIT $1`
	rows, err := tx.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var (
		streamID StreamId
		streams  = make([]StreamId, 0, limit)
	)
	if _, err = pgx.ForEachRow(rows, []any{&streamID}, func() error {
		streams = append(streams, streamID)
		return nil
	}); err != nil {
		return nil, err
	}

	return streams, nil
}

// StreamMiniblocksStoredLocation returns the location where miniblock data is stored.
func (s *PostgresStreamStore) StreamMiniblocksStoredLocation(
	ctx context.Context,
	streamID StreamId,
) (location external.MiniblockDataStorageLocation, err error) {
	err = s.txRunner(
		ctx,
		"StreamMiniblocksStoredLocation",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			lockStreamResult, err := s.lockStream(ctx, tx, streamID, false)
			if err == nil {
				location = lockStreamResult.MiniblockDataLocation
			}
			return err
		},
		nil,
		"streamId", streamID,
	)
	if err != nil {
		return external.MiniblockDataStorageLocationDB, err
	}

	return location, err
}

func (s *PostgresStreamStore) TestDeleteExternalObject(ctx context.Context, streamID StreamId) error {
	if s.externalStorage != nil {
		if extStorage, ok := s.externalStorage.(external.TestStorage); ok {
			return extStorage.TestDeleteExternalObject(ctx, streamID)
		}
	}
	return nil
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
