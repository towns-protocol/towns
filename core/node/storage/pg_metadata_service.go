package storage

import (
	"bytes"
	"context"
	"embed"
	"errors"
	"fmt"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	protocol "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

//go:embed metadata_migrations/*.sql
var metadataMigrationsDir embed.FS

var isoLevelRepeatableRead = pgx.RepeatableRead

type StreamRecordEventMask int16

const (
	StreamRecordEventMaskLastMiniblockHash StreamRecordEventMask = 1 << iota
	StreamRecordEventMaskLastMiniblockNum
	StreamRecordEventMaskNodes
	StreamRecordEventMaskReplicationFactor
	StreamRecordEventMaskSealed
)

type MetadataStreamRecord struct {
	StreamId          shared.StreamId
	LastMiniblockHash []byte
	LastMiniblockNum  int64
	NodeIndexes       []int32
	ReplicationFactor int32
	Sealed            bool
	CreatedAtBlock    int64
	UpdatedAtBlock    int64
}

type MetadataStreamRecordBlock struct {
	BlockNum  int64
	BlockSlot int64
	EventMask StreamRecordEventMask
	Record    *MetadataStreamRecord
}

type InsertMetadataStreamRecord struct {
	StreamId          shared.StreamId
	LastMiniblockHash []byte
	LastMiniblockNum  int64
	NodeIndexes       []int32
	ReplicationFactor int32
	Sealed            bool
}

type UpdateMetadataStreamPlacement struct {
	StreamId          shared.StreamId
	NodeIndexes       []int32
	ReplicationFactor int32
}

type UpdateMetadataStreamMiniblock struct {
	StreamId          shared.StreamId
	PrevMiniblockHash []byte
	LastMiniblockNum  int64
	LastMiniblockHash []byte
	Sealed            bool
}

type MetadataStreamRecordUpdate struct {
	Insert    *InsertMetadataStreamRecord
	Placement *UpdateMetadataStreamPlacement
	Miniblock *UpdateMetadataStreamMiniblock
}

type MetadataServiceStore interface {
	ListStreamRecords(
		ctx context.Context,
		pageSize int,
		cb func([]*MetadataStreamRecord) error,
	) (int64, error)
	ListStreamRecordsForNode(
		ctx context.Context,
		nodeIndex int32,
		pageSize int,
		cb func([]*MetadataStreamRecord) error,
	) (int64, error)
	BatchUpdateStreamRecords(
		ctx context.Context,
		updates []*MetadataStreamRecordUpdate,
	) (int64, []error, error)
	GetStreamRecord(
		ctx context.Context,
		streamId shared.StreamId,
	) (*MetadataStreamRecord, error)
	GetStreamRecordCount(ctx context.Context) (int64, error)
	GetStreamRecordCountOnNode(ctx context.Context, nodeIndex int32) (int64, error)
	GetRecordBlocks(
		ctx context.Context,
		fromInclusive int64,
		toExclusive int64,
	) ([]*MetadataStreamRecordBlock, error)
}

type PostgresMetadataServiceStore struct {
	PostgresEventStore

	exitSignal chan error
}

var _ MetadataServiceStore = (*PostgresMetadataServiceStore)(nil)

func DbSchemaNameForMetadataService(riverChainID uint64) string {
	return fmt.Sprintf("md_%d", riverChainID)
}

func NewPostgresMetadataServiceStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	exitSignal chan error,
	metrics infra.MetricsFactory,
) (*PostgresMetadataServiceStore, error) {
	store := &PostgresMetadataServiceStore{}
	if err := store.Init(ctx, poolInfo, exitSignal, metrics); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *PostgresMetadataServiceStore) Init(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	exitSignal chan error,
	metrics infra.MetricsFactory,
) error {
	s.exitSignal = exitSignal

	if err := s.PostgresEventStore.init(
		ctx,
		poolInfo,
		metrics,
		nil,
		&metadataMigrationsDir,
		"metadata_migrations",
	); err != nil {
		return AsRiverError(err).Func("PostgresMetadataServiceStore.Init")
	}

	if err := s.initStorage(ctx); err != nil {
		return AsRiverError(err).Func("PostgresMetadataServiceStore.Init")
	}

	return nil
}

func (s *PostgresMetadataServiceStore) ListStreamRecords(
	ctx context.Context,
	pageSize int,
	cb func([]*MetadataStreamRecord) error,
) (int64, error) {
	return s.listStreamRecords(ctx, "MetadataService.ListStreamRecords", nil, pageSize, cb)
}

func (s *PostgresMetadataServiceStore) ListStreamRecordsForNode(
	ctx context.Context,
	nodeIndex int32,
	pageSize int,
	cb func([]*MetadataStreamRecord) error,
) (int64, error) {
	if nodeIndex <= 0 {
		return 0, RiverError(protocol.Err_INVALID_ARGUMENT, "node index must be positive", "nodeIndex", nodeIndex)
	}
	return s.listStreamRecords(ctx, "MetadataService.ListStreamRecordsForNode", &nodeIndex, pageSize, cb)
}

func (s *PostgresMetadataServiceStore) listStreamRecords(
	ctx context.Context,
	opName string,
	nodeIndex *int32,
	pageSize int,
	cb func([]*MetadataStreamRecord) error,
) (int64, error) {
	if pageSize <= 0 {
		return 0, RiverError(protocol.Err_INVALID_ARGUMENT, "page_size must be positive", "pageSize", pageSize)
	}
	if cb == nil {
		return 0, RiverError(protocol.Err_INVALID_ARGUMENT, "callback is required")
	}

	var lastBlock int64
	err := s.txRunner(
		ctx,
		opName,
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			if err := tx.QueryRow(ctx, `SELECT block_num FROM md_last_block WHERE singleton_key = TRUE`).Scan(&lastBlock); err != nil {
				return err
			}

			var cursor []byte
			for {
				records, nextCursor, err := s.listStreamRecordsPageTx(ctx, tx, nodeIndex, pageSize, cursor)
				if err != nil {
					return err
				}
				if len(records) == 0 {
					return nil
				}
				if err := cb(records); err != nil {
					return err
				}
				cursor = nextCursor
			}
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelRepeatableRead},
	)
	return lastBlock, err
}

func (s *PostgresMetadataServiceStore) listStreamRecordsPageTx(
	ctx context.Context,
	tx pgx.Tx,
	nodeIndex *int32,
	pageSize int,
	cursor []byte,
) ([]*MetadataStreamRecord, []byte, error) {
	var (
		query string
		args  []any
	)

	if nodeIndex == nil {
		if len(cursor) == 0 {
			query = `
				SELECT stream_id,
					last_miniblock_hash,
					last_miniblock_num,
					replication_factor,
					sealed,
					nodes,
					created_at_block,
					updated_at_block
				FROM md_stream_records
				ORDER BY stream_id
				LIMIT $1`
			args = []any{pageSize}
		} else {
			query = `
				SELECT stream_id,
					last_miniblock_hash,
					last_miniblock_num,
					replication_factor,
					sealed,
					nodes,
					created_at_block,
					updated_at_block
				FROM md_stream_records
				WHERE stream_id > $1
				ORDER BY stream_id
				LIMIT $2`
			args = []any{cursor, pageSize}
		}
	} else {
		if len(cursor) == 0 {
			query = `
				SELECT r.stream_id,
					r.last_miniblock_hash,
					r.last_miniblock_num,
					r.replication_factor,
					r.sealed,
					r.nodes,
					r.created_at_block,
					r.updated_at_block
				FROM md_stream_placement p
				JOIN md_stream_records r ON r.stream_id = p.stream_id
				WHERE p.nodes @> ARRAY[$1]::int[]
				ORDER BY p.stream_id
				LIMIT $2`
			args = []any{*nodeIndex, pageSize}
		} else {
			query = `
				SELECT r.stream_id,
					r.last_miniblock_hash,
					r.last_miniblock_num,
					r.replication_factor,
					r.sealed,
					r.nodes,
					r.created_at_block,
					r.updated_at_block
				FROM md_stream_placement p
				JOIN md_stream_records r ON r.stream_id = p.stream_id
				WHERE p.nodes @> ARRAY[$1]::int[]
				  AND p.stream_id > $2
				ORDER BY p.stream_id
				LIMIT $3`
			args = []any{*nodeIndex, cursor, pageSize}
		}
	}

	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var records []*MetadataStreamRecord
	for rows.Next() {
		record, err := scanStreamRecord(rows)
		if err != nil {
			return nil, nil, err
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	if len(records) == 0 {
		return nil, nil, nil
	}

	nextCursor := append([]byte(nil), records[len(records)-1].StreamId[:]...)
	return records, nextCursor, nil
}

func (s *PostgresMetadataServiceStore) BatchUpdateStreamRecords(
	ctx context.Context,
	updates []*MetadataStreamRecordUpdate,
) (int64, []error, error) {
	if len(updates) == 0 {
		return 0, nil, RiverError(protocol.Err_INVALID_ARGUMENT, "updates must not be empty")
	}

	errs := make([]error, len(updates))
	var blockNum int64

	err := s.txRunner(
		ctx,
		"MetadataService.BatchUpdateStreamRecords",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			if err := tx.QueryRow(
				ctx,
				`SELECT block_num FROM md_last_block WHERE singleton_key = TRUE FOR UPDATE`,
			).Scan(&blockNum); err != nil {
				return err
			}
			blockNum++

			if _, err := tx.Exec(
				ctx,
				`UPDATE md_last_block SET block_num = $1 WHERE singleton_key = TRUE`,
				blockNum,
			); err != nil {
				return err
			}

			blockSlot := int64(0)
			for i, update := range updates {
				if update == nil {
					errs[i] = RiverError(protocol.Err_INVALID_ARGUMENT, "update is nil")
					continue
				}

				record, mask, err := s.applyStreamRecordUpdateTx(ctx, tx, blockNum, update)
				if err != nil {
					if isStreamRecordUpdateValidationError(err) {
						errs[i] = err
						continue
					}
					return err
				}

				if err := s.insertRecordBlockTx(ctx, tx, blockNum, blockSlot, mask, record); err != nil {
					return err
				}
				blockSlot++
			}

			return nil
		},
		nil,
	)
	if err != nil {
		return 0, errs, err
	}
	return blockNum, errs, nil
}

func (s *PostgresMetadataServiceStore) applyStreamRecordUpdateTx(
	ctx context.Context,
	tx pgx.Tx,
	blockNum int64,
	update *MetadataStreamRecordUpdate,
) (*MetadataStreamRecord, StreamRecordEventMask, error) {
	updateCount := 0
	if update.Insert != nil {
		updateCount++
	}
	if update.Placement != nil {
		updateCount++
	}
	if update.Miniblock != nil {
		updateCount++
	}
	if updateCount == 0 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "update has no operation")
	}
	if updateCount > 1 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "update must include a single operation")
	}

	switch {
	case update.Insert != nil:
		return s.applyInsertStreamRecordTx(ctx, tx, blockNum, update.Insert)
	case update.Placement != nil:
		return s.applyUpdateStreamPlacementTx(ctx, tx, blockNum, update.Placement)
	case update.Miniblock != nil:
		return s.applyUpdateStreamMiniblockTx(ctx, tx, blockNum, update.Miniblock)
	default:
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "unknown update type")
	}
}

func (s *PostgresMetadataServiceStore) applyInsertStreamRecordTx(
	ctx context.Context,
	tx pgx.Tx,
	blockNum int64,
	update *InsertMetadataStreamRecord,
) (*MetadataStreamRecord, StreamRecordEventMask, error) {
	if update == nil {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "insert update is nil")
	}
	if update.LastMiniblockNum < 0 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "last_miniblock_num must be non-negative")
	}
	if len(update.LastMiniblockHash) != 32 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "last_miniblock_hash must be 32 bytes")
	}
	if update.ReplicationFactor <= 0 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "replication_factor must be positive")
	}
	if err := validateNodeIndexes(update.NodeIndexes, false); err != nil {
		return nil, 0, err
	}
	if int(update.ReplicationFactor) > len(update.NodeIndexes) {
		return nil, 0, RiverError(
			protocol.Err_INVALID_ARGUMENT,
			"replication_factor must not exceed node count",
			"replicationFactor", update.ReplicationFactor,
			"nodeCount", len(update.NodeIndexes),
		)
	}

	var exists bool
	if err := tx.QueryRow(
		ctx,
		`SELECT EXISTS (SELECT 1 FROM md_stream_records WHERE stream_id = $1)`,
		update.StreamId[:],
	).Scan(&exists); err != nil {
		return nil, 0, err
	}
	if exists {
		return nil, 0, RiverError(protocol.Err_ALREADY_EXISTS, "stream already exists", "streamId", update.StreamId)
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO md_stream_records (
			stream_id,
			last_miniblock_hash,
			last_miniblock_num,
			replication_factor,
			sealed,
			nodes,
			created_at_block,
			updated_at_block
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		update.StreamId[:],
		update.LastMiniblockHash,
		update.LastMiniblockNum,
		update.ReplicationFactor,
		update.Sealed,
		update.NodeIndexes,
		blockNum,
		blockNum,
	); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
			return nil, 0, RiverError(protocol.Err_ALREADY_EXISTS, "stream already exists", "streamId", update.StreamId)
		}
		return nil, 0, err
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO md_stream_placement (stream_id, nodes) VALUES ($1,$2)`,
		update.StreamId[:],
		update.NodeIndexes,
	); err != nil {
		return nil, 0, err
	}

	record := &MetadataStreamRecord{
		StreamId:          update.StreamId,
		LastMiniblockHash: update.LastMiniblockHash,
		LastMiniblockNum:  update.LastMiniblockNum,
		NodeIndexes:       update.NodeIndexes,
		ReplicationFactor: update.ReplicationFactor,
		Sealed:            update.Sealed,
		CreatedAtBlock:    blockNum,
		UpdatedAtBlock:    blockNum,
	}

	mask := StreamRecordEventMaskLastMiniblockHash |
		StreamRecordEventMaskLastMiniblockNum |
		StreamRecordEventMaskNodes |
		StreamRecordEventMaskReplicationFactor |
		StreamRecordEventMaskSealed

	return record, mask, nil
}

func (s *PostgresMetadataServiceStore) applyUpdateStreamPlacementTx(
	ctx context.Context,
	tx pgx.Tx,
	blockNum int64,
	update *UpdateMetadataStreamPlacement,
) (*MetadataStreamRecord, StreamRecordEventMask, error) {
	if update == nil {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "placement update is nil")
	}
	if update.ReplicationFactor < 0 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "replication_factor must not be negative")
	}
	if len(update.NodeIndexes) == 0 && update.ReplicationFactor == 0 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "placement update must include nodes and/or replication_factor")
	}
	if len(update.NodeIndexes) > 0 {
		if err := validateNodeIndexes(update.NodeIndexes, false); err != nil {
			return nil, 0, err
		}
	}

	record, err := s.getStreamRecordForUpdateTx(ctx, tx, update.StreamId)
	if err != nil {
		return nil, 0, err
	}

	newNodes := record.NodeIndexes
	newRepl := record.ReplicationFactor

	switch {
	case update.ReplicationFactor > 0 && len(update.NodeIndexes) > 0:
		if int(update.ReplicationFactor) > len(update.NodeIndexes) {
			return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "replication_factor exceeds node count")
		}
		newRepl = update.ReplicationFactor
		newNodes = update.NodeIndexes
	case update.ReplicationFactor > 0:
		if int(update.ReplicationFactor) > len(record.NodeIndexes) {
			return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "replication_factor exceeds node count")
		}
		newRepl = update.ReplicationFactor
	case len(update.NodeIndexes) > 0:
		if len(update.NodeIndexes) < int(record.ReplicationFactor) {
			return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "node count below replication_factor")
		}
		newNodes = update.NodeIndexes
	}

	if _, err := tx.Exec(
		ctx,
		`UPDATE md_stream_records
		 SET replication_factor = $2,
			 nodes = $3,
			 updated_at_block = $4
		 WHERE stream_id = $1`,
		update.StreamId[:],
		newRepl,
		newNodes,
		blockNum,
	); err != nil {
		return nil, 0, err
	}

	if len(update.NodeIndexes) > 0 {
		if _, err := tx.Exec(
			ctx,
			`UPDATE md_stream_placement SET nodes = $2 WHERE stream_id = $1`,
			update.StreamId[:],
			newNodes,
		); err != nil {
			return nil, 0, err
		}
	}

	record.NodeIndexes = newNodes
	record.ReplicationFactor = newRepl
	record.UpdatedAtBlock = blockNum

	var mask StreamRecordEventMask
	if len(update.NodeIndexes) > 0 {
		mask |= StreamRecordEventMaskNodes
	}
	if update.ReplicationFactor > 0 {
		mask |= StreamRecordEventMaskReplicationFactor
	}

	return record, mask, nil
}

func (s *PostgresMetadataServiceStore) applyUpdateStreamMiniblockTx(
	ctx context.Context,
	tx pgx.Tx,
	blockNum int64,
	update *UpdateMetadataStreamMiniblock,
) (*MetadataStreamRecord, StreamRecordEventMask, error) {
	if update == nil {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "miniblock update is nil")
	}
	if update.LastMiniblockNum < 0 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "last_miniblock_num must be non-negative")
	}
	if len(update.LastMiniblockHash) != 32 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "last_miniblock_hash must be 32 bytes")
	}
	if len(update.PrevMiniblockHash) != 32 {
		return nil, 0, RiverError(protocol.Err_INVALID_ARGUMENT, "prev_miniblock_hash must be 32 bytes")
	}

	record, err := s.getStreamRecordForUpdateTx(ctx, tx, update.StreamId)
	if err != nil {
		return nil, 0, err
	}

	if record.Sealed {
		return nil, 0, RiverError(protocol.Err_FAILED_PRECONDITION, "stream is sealed", "streamId", update.StreamId)
	}
	if !bytes.Equal(record.LastMiniblockHash, update.PrevMiniblockHash) {
		return nil, 0, RiverError(protocol.Err_BAD_PREV_MINIBLOCK_HASH, "prev_miniblock_hash mismatch", "streamId", update.StreamId)
	}
	if record.LastMiniblockNum+1 != update.LastMiniblockNum {
		return nil, 0, RiverError(protocol.Err_BAD_BLOCK_NUMBER, "last_miniblock_num must increase by 1", "streamId", update.StreamId)
	}

	sealed := record.Sealed
	if update.Sealed {
		sealed = true
	}

	if _, err := tx.Exec(
		ctx,
		`UPDATE md_stream_records
		 SET last_miniblock_hash = $2,
			 last_miniblock_num = $3,
			 sealed = $4,
			 updated_at_block = $5
		 WHERE stream_id = $1`,
		update.StreamId[:],
		update.LastMiniblockHash,
		update.LastMiniblockNum,
		sealed,
		blockNum,
	); err != nil {
		return nil, 0, err
	}

	record.LastMiniblockHash = update.LastMiniblockHash
	record.LastMiniblockNum = update.LastMiniblockNum
	record.Sealed = sealed
	record.UpdatedAtBlock = blockNum

	mask := StreamRecordEventMaskLastMiniblockHash | StreamRecordEventMaskLastMiniblockNum
	if update.Sealed {
		mask |= StreamRecordEventMaskSealed
	}

	return record, mask, nil
}

func (s *PostgresMetadataServiceStore) GetStreamRecord(
	ctx context.Context,
	streamId shared.StreamId,
) (*MetadataStreamRecord, error) {
	var record *MetadataStreamRecord
	err := s.txRunner(
		ctx,
		"MetadataService.GetStreamRecord",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var innerErr error
			record, innerErr = s.getStreamRecordTx(ctx, tx, streamId)
			return innerErr
		},
		&txRunnerOpts{skipLoggingNotFound: true},
		"streamId", streamId,
	)
	return record, err
}

func (s *PostgresMetadataServiceStore) GetStreamRecordCount(ctx context.Context) (int64, error) {
	var count int64
	err := s.txRunner(
		ctx,
		"MetadataService.GetStreamRecordCount",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(ctx, `SELECT COUNT(*) FROM md_stream_records`).Scan(&count)
		},
		nil,
	)
	return count, err
}

func (s *PostgresMetadataServiceStore) GetStreamRecordCountOnNode(
	ctx context.Context,
	nodeIndex int32,
) (int64, error) {
	if nodeIndex <= 0 {
		return 0, RiverError(protocol.Err_INVALID_ARGUMENT, "node index must be positive", "nodeIndex", nodeIndex)
	}
	var count int64
	err := s.txRunner(
		ctx,
		"MetadataService.GetStreamRecordCountOnNode",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(
				ctx,
				`SELECT COUNT(*) FROM md_stream_placement WHERE nodes @> ARRAY[$1]::int[]`,
				nodeIndex,
			).Scan(&count)
		},
		nil,
		"nodeIndex", nodeIndex,
	)
	return count, err
}

func (s *PostgresMetadataServiceStore) GetRecordBlocks(
	ctx context.Context,
	fromInclusive int64,
	toExclusive int64,
) ([]*MetadataStreamRecordBlock, error) {
	if fromInclusive < 0 || toExclusive < 0 {
		return nil, RiverError(protocol.Err_INVALID_ARGUMENT, "block range must be non-negative")
	}
	if toExclusive < fromInclusive {
		return nil, RiverError(protocol.Err_INVALID_ARGUMENT, "block range is invalid")
	}

	var blocks []*MetadataStreamRecordBlock
	err := s.txRunner(
		ctx,
		"MetadataService.GetRecordBlocks",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			rows, err := tx.Query(
				ctx,
				`SELECT block_num,
					block_slot,
					stream_id,
					event_mask,
					last_miniblock_hash,
					last_miniblock_num,
					nodes,
					replication_factor,
					sealed
				FROM md_blocks
				WHERE block_num >= $1 AND block_num < $2
				ORDER BY block_num, block_slot`,
				fromInclusive,
				toExclusive,
			)
			if err != nil {
				return err
			}
			defer rows.Close()

			for rows.Next() {
				var (
					blockNum      int64
					blockSlot     int64
					streamIDBytes []byte
					eventMask     int16
					lastHash      []byte
					lastNum       int64
					nodeIndexes   []int32
					replication   int32
					sealed        bool
				)
				if err := rows.Scan(
					&blockNum,
					&blockSlot,
					&streamIDBytes,
					&eventMask,
					&lastHash,
					&lastNum,
					&nodeIndexes,
					&replication,
					&sealed,
				); err != nil {
					return err
				}
				streamId, err := shared.StreamIdFromBytes(streamIDBytes)
				if err != nil {
					return err
				}
				record := &MetadataStreamRecord{
					StreamId:          streamId,
					LastMiniblockHash: lastHash,
					LastMiniblockNum:  lastNum,
					NodeIndexes:       nodeIndexes,
					ReplicationFactor: replication,
					Sealed:            sealed,
				}
				blocks = append(blocks, &MetadataStreamRecordBlock{
					BlockNum:  blockNum,
					BlockSlot: blockSlot,
					EventMask: StreamRecordEventMask(eventMask),
					Record:    record,
				})
			}
			return rows.Err()
		},
		nil,
	)
	return blocks, err
}

func (s *PostgresMetadataServiceStore) getStreamRecordTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId shared.StreamId,
) (*MetadataStreamRecord, error) {
	row := tx.QueryRow(
		ctx,
		`SELECT stream_id,
			last_miniblock_hash,
			last_miniblock_num,
			replication_factor,
			sealed,
			nodes,
			created_at_block,
			updated_at_block
		FROM md_stream_records
		WHERE stream_id = $1`,
		streamId[:],
	)
	record, err := scanStreamRecord(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "stream not found", "streamId", streamId)
		}
		return nil, err
	}
	return record, nil
}

func (s *PostgresMetadataServiceStore) getStreamRecordForUpdateTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId shared.StreamId,
) (*MetadataStreamRecord, error) {
	row := tx.QueryRow(
		ctx,
		`SELECT stream_id,
			last_miniblock_hash,
			last_miniblock_num,
			replication_factor,
			sealed,
			nodes,
			created_at_block,
			updated_at_block
		FROM md_stream_records
		WHERE stream_id = $1
		FOR UPDATE`,
		streamId[:],
	)
	record, err := scanStreamRecord(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "stream not found", "streamId", streamId)
		}
		return nil, err
	}
	return record, nil
}

func scanStreamRecord(row pgx.Row) (*MetadataStreamRecord, error) {
	var (
		streamIDBytes  []byte
		lastHash       []byte
		lastNum        int64
		replication    int32
		sealed         bool
		nodeIndexes    []int32
		createdAtBlock int64
		updatedAtBlock int64
	)
	if err := row.Scan(
		&streamIDBytes,
		&lastHash,
		&lastNum,
		&replication,
		&sealed,
		&nodeIndexes,
		&createdAtBlock,
		&updatedAtBlock,
	); err != nil {
		return nil, err
	}
	streamId, err := shared.StreamIdFromBytes(streamIDBytes)
	if err != nil {
		return nil, err
	}
	return &MetadataStreamRecord{
		StreamId:          streamId,
		LastMiniblockHash: lastHash,
		LastMiniblockNum:  lastNum,
		NodeIndexes:       nodeIndexes,
		ReplicationFactor: replication,
		Sealed:            sealed,
		CreatedAtBlock:    createdAtBlock,
		UpdatedAtBlock:    updatedAtBlock,
	}, nil
}

func (s *PostgresMetadataServiceStore) insertRecordBlockTx(
	ctx context.Context,
	tx pgx.Tx,
	blockNum int64,
	blockSlot int64,
	mask StreamRecordEventMask,
	record *MetadataStreamRecord,
) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO md_blocks (
			block_num,
			block_slot,
			stream_id,
			event_mask,
			last_miniblock_hash,
			last_miniblock_num,
			nodes,
			replication_factor,
			sealed
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		blockNum,
		blockSlot,
		record.StreamId[:],
		int16(mask),
		record.LastMiniblockHash,
		record.LastMiniblockNum,
		record.NodeIndexes,
		record.ReplicationFactor,
		record.Sealed,
	)
	return err
}

func isStreamRecordUpdateValidationError(err error) bool {
	if err == nil {
		return false
	}
	switch AsRiverError(err).Code {
	case protocol.Err_INVALID_ARGUMENT,
		protocol.Err_ALREADY_EXISTS,
		protocol.Err_NOT_FOUND,
		protocol.Err_BAD_PREV_MINIBLOCK_HASH,
		protocol.Err_BAD_BLOCK_NUMBER,
		protocol.Err_FAILED_PRECONDITION:
		return true
	default:
		return false
	}
}

func validateNodeIndexes(nodes []int32, allowEmpty bool) error {
	if len(nodes) == 0 {
		if allowEmpty {
			return nil
		}
		return RiverError(protocol.Err_INVALID_ARGUMENT, "nodes must not be empty")
	}

	seen := make(map[int32]struct{}, len(nodes))
	for _, idx := range nodes {
		if idx <= 0 {
			return RiverError(protocol.Err_INVALID_ARGUMENT, "node index must be positive", "index", idx)
		}
		if _, ok := seen[idx]; ok {
			return RiverError(protocol.Err_INVALID_ARGUMENT, "node indexes must be unique", "index", idx)
		}
		seen[idx] = struct{}{}
	}
	return nil
}
