package storage

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

func (s *PostgresStreamStore) DebugReadStreamData(
	ctx context.Context,
	streamId StreamId,
) (*DebugReadStreamDataResult, error) {
	var ret *DebugReadStreamDataResult
	if err := s.txRunner(
		ctx,
		"DebugReadStreamData",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.debugReadStreamDataTx(ctx, tx, streamId)
			return err
		},
		nil,
		"streamId", streamId,
	); err != nil {
		return nil, err
	}
	return ret, nil
}

func (s *PostgresStreamStore) debugReadStreamDataTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (*DebugReadStreamDataResult, error) {
	lockStream, err := s.lockStream(ctx, tx, streamId, false)
	if err != nil {
		return nil, err
	}

	result := &DebugReadStreamDataResult{
		StreamId:                   streamId,
		LatestSnapshotMiniblockNum: lockStream.LastSnapshotMiniblock,
	}

	miniblocksRow, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT seq_num, blockdata, snapshot FROM {{miniblocks}} WHERE stream_id = $1 ORDER BY seq_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}

	var mb MiniblockDescriptor
	if _, err := pgx.ForEachRow(miniblocksRow, []any{&mb.Number, &mb.Data, &mb.Snapshot}, func() error {
		result.Miniblocks = append(result.Miniblocks, mb)
		return nil
	}); err != nil {
		return nil, err
	}

	rows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT generation, slot_num, envelope FROM {{minipools}} WHERE stream_id = $1 ORDER BY generation, slot_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}

	var e EventDescriptor
	if _, err := pgx.ForEachRow(rows, []any{&e.Generation, &e.Slot, &e.Data}, func() error {
		result.Events = append(result.Events, e)
		return nil
	}); err != nil {
		return nil, err
	}

	candRows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT seq_num, block_hash, blockdata, snapshot FROM {{miniblock_candidates}} WHERE stream_id = $1 ORDER BY seq_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}

	var num int64
	var hashStr string
	var data []byte
	var snapshot []byte
	if _, err := pgx.ForEachRow(candRows, []any{&num, &hashStr, &data, &snapshot}, func() error {
		if len(snapshot) == 0 {
			snapshot = nil
		}
		result.MbCandidates = append(result.MbCandidates, MiniblockDescriptor{
			Number:   num,
			Data:     data,
			Hash:     common.HexToHash(hashStr),
			Snapshot: snapshot,
		})
		return nil
	}); err != nil {
		return nil, err
	}

	return result, nil
}

func (s *PostgresStreamStore) DebugDeleteMiniblocks(
	ctx context.Context,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) error {
	return s.txRunner(
		ctx,
		"DebugDeleteMiniblocks",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.debugDeleteMiniblocksTx(ctx, tx, streamId, fromInclusive, toExclusive)
		},
		nil,
		"streamId", streamId,
		"fromInclusive", fromInclusive,
		"toExclusive", toExclusive,
	)
}

func (s *PostgresStreamStore) debugDeleteMiniblocksTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) error {
	// Lock the stream to ensure consistency
	_, err := s.lockStream(ctx, tx, streamId, true)
	if err != nil {
		return err
	}

	// Delete miniblocks in the specified range
	query := s.sqlForStream(
		"DELETE FROM {{miniblocks}} WHERE stream_id = $1 AND seq_num >= $2 AND seq_num < $3",
		streamId,
	)

	result, err := tx.Exec(ctx, query, streamId, fromInclusive, toExclusive)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
			Message("Failed to delete miniblocks").
			Tag("streamId", streamId).
			Tag("fromInclusive", fromInclusive).
			Tag("toExclusive", toExclusive)
	}

	rowsAffected := result.RowsAffected()
	logging.FromCtx(ctx).Infow("DebugDeleteMiniblocks completed",
		"streamId", streamId,
		"fromInclusive", fromInclusive,
		"toExclusive", toExclusive,
		"rowsDeleted", rowsAffected,
	)

	return nil
}

func (s *PostgresStreamStore) DebugReadStreamStatistics(
	ctx context.Context,
	streamId StreamId,
) (*DebugReadStreamStatisticsResult, error) {
	var ret *DebugReadStreamStatisticsResult
	if err := s.txRunner(
		ctx,
		"DebugReadStreamStatistics",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.debugReadStreamStatisticsTx(ctx, tx, streamId)
			return err
		},
		nil,
		"streamId", streamId,
	); err != nil {
		return nil, err
	}
	return ret, nil
}

func (s *PostgresStreamStore) debugReadStreamStatisticsTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (*DebugReadStreamStatisticsResult, error) {
	lockStream, err := s.lockStream(ctx, tx, streamId, false)
	if err != nil {
		return nil, err
	}

	result := &DebugReadStreamStatisticsResult{
		StreamId:                   streamId.String(),
		LatestSnapshotMiniblockNum: lockStream.LastSnapshotMiniblock,
	}

	result.MiniblocksRanges, err = s.getMiniblockNumberRangesTxNoLock(ctx, tx, streamId)
	if err != nil {
		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).Tag("query", "miniblock_ranges")
	}

	if err = tx.QueryRow(
		ctx,
		s.sqlForStream(
			"SELECT count(*) FROM {{minipools}} WHERE stream_id = $1 AND slot_num <> -1",
			streamId,
		),
		streamId,
	).Scan(&result.NumMinipoolEvents); err != nil {
		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).Tag("query", "minipool_size")
	}

	candRows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT seq_num, block_hash FROM {{miniblock_candidates}} WHERE stream_id = $1 ORDER BY seq_num, block_hash",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).Tag("query", "candidates")
	}

	var candidate MiniblockCandidateStatisticsResult
	if _, err := pgx.ForEachRow(candRows, []any{&candidate.BlockNum, &candidate.Hash}, func() error {
		result.CurrentMiniblockCandidates = append(result.CurrentMiniblockCandidates, candidate)
		return nil
	}); err != nil {
		return nil, err
	}

	return result, nil
}
