package storage

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	protocol "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

//go:embed metadata_migrations/*.sql
var metadataMigrationsDir embed.FS

var isoLevelRepeatableRead = pgx.RepeatableRead

const metadataRecordBlockNotifyChannel = "md_record_block"

type StreamRecordEventMask int16

const (
	StreamRecordEventMaskLastMiniblock StreamRecordEventMask = 1 << iota
	StreamRecordEventMaskNodes
	StreamRecordEventMaskReplicationFactor
	StreamRecordEventMaskSealed
	StreamRecordEventMaskInserted
)

type MetadataStreamRecord struct {
	StreamId          shared.StreamId
	LastMiniblock     shared.MiniblockRef
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
	LastMiniblock     shared.MiniblockRef
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
	StreamId      shared.StreamId
	PrevMiniblock shared.MiniblockRef
	LastMiniblock shared.MiniblockRef
	Sealed        bool
}

type MetadataStreamRecordUpdate struct {
	Insert    *InsertMetadataStreamRecord
	Placement *UpdateMetadataStreamPlacement
	Miniblock *UpdateMetadataStreamMiniblock
}

type streamRecordUpdateResult struct {
	record        *MetadataStreamRecord
	mask          StreamRecordEventMask
	validationErr error
	insertionErr  error
}

type MetadataServiceStore interface {
	// ListStreamRecords streams all records in stream_id order using a repeatable-read snapshot.
	// The callback is invoked for each page and may return an error to stop iteration; that
	// error is returned as the method error. The final return value is the last block number
	// visible in the snapshot.
	ListStreamRecords(
		ctx context.Context,
		pageSize int,
		cb func([]*MetadataStreamRecord) error,
	) (int64, error)

	// ListStreamRecordsForNode streams records assigned to nodeIndex in stream_id order using a
	// repeatable-read snapshot. The callback is invoked for each page and may return an error to
	// stop iteration; that error is returned as the method error. The final return value is the
	// last block number visible in the snapshot.
	ListStreamRecordsForNode(
		ctx context.Context,
		nodeIndex int32,
		pageSize int,
		cb func([]*MetadataStreamRecord) error,
	) (int64, error)

	// BatchUpdateStreamRecords applies a batch of updates, returning the new block number and a
	// per-update error slice (nil for successful updates). The returned error is for fatal failures
	// that abort the batch. numBlocksToKeep trims md_blocks to keep the latest N blocks; use 0 to
	// disable trimming.
	BatchUpdateStreamRecords(
		ctx context.Context,
		updates []*MetadataStreamRecordUpdate,
		numBlocksToKeep int64,
	) (int64, []error, error)

	// GetStreamRecord returns the current record or Err_NOT_FOUND if it doesn't exist.
	GetStreamRecord(
		ctx context.Context,
		streamId shared.StreamId,
	) (*MetadataStreamRecord, error)

	// GetStreamRecordCount returns the total number of records.
	GetStreamRecordCount(ctx context.Context) (int64, error)

	// GetStreamRecordCountOnNode returns the number of records whose placement includes nodeIndex.
	GetStreamRecordCountOnNode(ctx context.Context, nodeIndex int32) (int64, error)

	// GetLastRecordBlockNum returns the current block number from md_last_block.
	GetLastRecordBlockNum(ctx context.Context) (int64, error)

	// OnNewRecordBlock returns channels that receive new block numbers and fatal errors.
	// If setup or retrying exceeds timeout, an error is sent and both channels are closed.
	// Channels are also closed when ctx is canceled.
	OnNewRecordBlock(ctx context.Context, timeout time.Duration) (<-chan int64, <-chan error)

	// GetRecordBlocks returns blocks in the [fromInclusive, toExclusive) range ordered by block_num
	// and block_slot. Missing blocks in the range are ignored, and if no blocks exist in the range
	// the returned slice is nil.
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
			var (
				query string
				args  []any
			)
			if nodeIndex == nil {
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
					ORDER BY stream_id`
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
					ORDER BY p.stream_id`
				args = []any{*nodeIndex}
			}

			rows, err := tx.Query(ctx, query, args...)
			if err != nil {
				return err
			}

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

			page := make([]*MetadataStreamRecord, 0, pageSize)
			_, err = pgx.ForEachRow(
				rows,
				[]any{
					&streamIDBytes,
					&lastHash,
					&lastNum,
					&replication,
					&sealed,
					&nodeIndexes,
					&createdAtBlock,
					&updatedAtBlock,
				},
				func() error {
					streamId, err := shared.StreamIdFromBytes(streamIDBytes)
					if err != nil {
						return err
					}
					record := &MetadataStreamRecord{
						StreamId: streamId,
						LastMiniblock: shared.MiniblockRef{
							Hash: common.BytesToHash(lastHash),
							Num:  lastNum,
						},
						NodeIndexes:       append([]int32(nil), nodeIndexes...),
						ReplicationFactor: replication,
						Sealed:            sealed,
						CreatedAtBlock:    createdAtBlock,
						UpdatedAtBlock:    updatedAtBlock,
					}
					page = append(page, record)
					if len(page) < pageSize {
						return nil
					}
					if err := cb(page); err != nil {
						return err
					}
					page = make([]*MetadataStreamRecord, 0, pageSize)
					return nil
				},
			)
			if err != nil {
				return err
			}

			if len(page) == 0 {
				return nil
			}
			return cb(page)
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelRepeatableRead},
	)
	return lastBlock, err
}

func (s *PostgresMetadataServiceStore) BatchUpdateStreamRecords(
	ctx context.Context,
	updates []*MetadataStreamRecordUpdate,
	numBlocksToKeep int64,
) (int64, []error, error) {
	if len(updates) == 0 {
		return 0, nil, RiverError(protocol.Err_INVALID_ARGUMENT, "updates must not be empty")
	}
	if numBlocksToKeep < 0 {
		return 0, nil, RiverError(protocol.Err_INVALID_ARGUMENT, "numBlocksToKeep must be non-negative")
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
				result, err := s.applyStreamRecordUpdateTx(ctx, tx, blockNum, update)
				if err != nil {
					return err
				}
				if result.validationErr != nil {
					errs[i] = result.validationErr
					continue
				}
				if result.insertionErr != nil {
					errs[i] = result.insertionErr
					continue
				}
				if result.record == nil {
					return RiverError(protocol.Err_INTERNAL, "stream record update produced no record")
				}

				if err := s.insertRecordBlockTx(ctx, tx, blockNum, blockSlot, result.mask, result.record); err != nil {
					return err
				}
				blockSlot++
			}

			if numBlocksToKeep > 0 {
				cutoff := blockNum - numBlocksToKeep + 1
				if cutoff > 0 {
					if _, err := tx.Exec(
						ctx,
						`DELETE FROM md_blocks WHERE block_num < $1`,
						cutoff,
					); err != nil {
						return err
					}
				}
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
) (streamRecordUpdateResult, error) {
	if update == nil {
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "update is nil"),
		}, nil
	}

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
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "update has no operation"),
		}, nil
	}
	if updateCount > 1 {
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "update must include a single operation"),
		}, nil
	}

	switch {
	case update.Insert != nil:
		return s.applyInsertStreamRecordTx(ctx, tx, blockNum, update.Insert)
	case update.Placement != nil:
		return s.applyUpdateStreamPlacementTx(ctx, tx, blockNum, update.Placement)
	case update.Miniblock != nil:
		return s.applyUpdateStreamMiniblockTx(ctx, tx, blockNum, update.Miniblock)
	default:
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "unknown update type"),
		}, nil
	}
}

func (s *PostgresMetadataServiceStore) applyInsertStreamRecordTx(
	ctx context.Context,
	tx pgx.Tx,
	blockNum int64,
	update *InsertMetadataStreamRecord,
) (streamRecordUpdateResult, error) {
	if update == nil {
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "insert update is nil"),
		}, nil
	}
	if update.LastMiniblock.Num < 0 {
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "last_miniblock_num must be non-negative"),
		}, nil
	}
	if update.ReplicationFactor <= 0 {
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "replication_factor must be positive"),
		}, nil
	}
	if err := validateNodeIndexes(update.NodeIndexes, false); err != nil {
		return streamRecordUpdateResult{
			validationErr: err,
		}, nil
	}
	if int(update.ReplicationFactor) > len(update.NodeIndexes) {
		return streamRecordUpdateResult{
			validationErr: RiverError(
				protocol.Err_INVALID_ARGUMENT,
				"replication_factor must not exceed node count",
				"replicationFactor", update.ReplicationFactor,
				"nodeCount", len(update.NodeIndexes),
			),
		}, nil
	}

	var exists bool
	if err := tx.QueryRow(
		ctx,
		`SELECT EXISTS (SELECT 1 FROM md_stream_records WHERE stream_id = $1)`,
		update.StreamId[:],
	).Scan(&exists); err != nil {
		return streamRecordUpdateResult{}, err
	}
	if exists {
		return streamRecordUpdateResult{
			insertionErr: RiverError(protocol.Err_ALREADY_EXISTS, "stream already exists", "streamId", update.StreamId),
		}, nil
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
		update.LastMiniblock.Hash.Bytes(),
		update.LastMiniblock.Num,
		update.ReplicationFactor,
		update.Sealed,
		update.NodeIndexes,
		blockNum,
		blockNum,
	); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
			return streamRecordUpdateResult{
				insertionErr: RiverError(
					protocol.Err_ALREADY_EXISTS,
					"stream already exists",
					"streamId",
					update.StreamId,
				),
			}, nil
		}
		return streamRecordUpdateResult{}, err
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO md_stream_placement (stream_id, nodes) VALUES ($1,$2)`,
		update.StreamId[:],
		update.NodeIndexes,
	); err != nil {
		return streamRecordUpdateResult{}, err
	}

	record := &MetadataStreamRecord{
		StreamId:          update.StreamId,
		LastMiniblock:     update.LastMiniblock,
		NodeIndexes:       update.NodeIndexes,
		ReplicationFactor: update.ReplicationFactor,
		Sealed:            update.Sealed,
		CreatedAtBlock:    blockNum,
		UpdatedAtBlock:    blockNum,
	}

	mask := StreamRecordEventMaskLastMiniblock |
		StreamRecordEventMaskNodes |
		StreamRecordEventMaskReplicationFactor |
		StreamRecordEventMaskSealed |
		StreamRecordEventMaskInserted

	return streamRecordUpdateResult{
		record: record,
		mask:   mask,
	}, nil
}

func (s *PostgresMetadataServiceStore) applyUpdateStreamPlacementTx(
	ctx context.Context,
	tx pgx.Tx,
	blockNum int64,
	update *UpdateMetadataStreamPlacement,
) (streamRecordUpdateResult, error) {
	if update == nil {
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "placement update is nil"),
		}, nil
	}
	if update.ReplicationFactor < 0 {
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "replication_factor must not be negative"),
		}, nil
	}
	if len(update.NodeIndexes) == 0 && update.ReplicationFactor == 0 {
		return streamRecordUpdateResult{
			validationErr: RiverError(
				protocol.Err_INVALID_ARGUMENT,
				"placement update must include nodes and/or replication_factor",
			),
		}, nil
	}
	if len(update.NodeIndexes) > 0 {
		if err := validateNodeIndexes(update.NodeIndexes, false); err != nil {
			return streamRecordUpdateResult{
				validationErr: err,
			}, nil
		}
	}
	if update.ReplicationFactor > 0 && len(update.NodeIndexes) > 0 {
		if int(update.ReplicationFactor) > len(update.NodeIndexes) {
			return streamRecordUpdateResult{
				validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "replication_factor exceeds node count"),
			}, nil
		}
	}

	record, err := s.getStreamRecordForUpdateTx(ctx, tx, update.StreamId)
	if err != nil {
		if AsRiverError(err).Code == protocol.Err_NOT_FOUND {
			return streamRecordUpdateResult{
				insertionErr: err,
			}, nil
		}
		return streamRecordUpdateResult{}, err
	}

	newNodes := record.NodeIndexes
	newRepl := record.ReplicationFactor

	switch {
	case update.ReplicationFactor > 0 && len(update.NodeIndexes) > 0:
		newRepl = update.ReplicationFactor
		newNodes = update.NodeIndexes
	case update.ReplicationFactor > 0:
		if int(update.ReplicationFactor) > len(record.NodeIndexes) {
			return streamRecordUpdateResult{
				insertionErr: RiverError(protocol.Err_INVALID_ARGUMENT, "replication_factor exceeds node count"),
			}, nil
		}
		newRepl = update.ReplicationFactor
	case len(update.NodeIndexes) > 0:
		if len(update.NodeIndexes) < int(record.ReplicationFactor) {
			return streamRecordUpdateResult{
				insertionErr: RiverError(protocol.Err_INVALID_ARGUMENT, "node count below replication_factor"),
			}, nil
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
		return streamRecordUpdateResult{}, err
	}

	if len(update.NodeIndexes) > 0 {
		if _, err := tx.Exec(
			ctx,
			`UPDATE md_stream_placement SET nodes = $2 WHERE stream_id = $1`,
			update.StreamId[:],
			newNodes,
		); err != nil {
			return streamRecordUpdateResult{}, err
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

	return streamRecordUpdateResult{
		record: record,
		mask:   mask,
	}, nil
}

func (s *PostgresMetadataServiceStore) applyUpdateStreamMiniblockTx(
	ctx context.Context,
	tx pgx.Tx,
	blockNum int64,
	update *UpdateMetadataStreamMiniblock,
) (streamRecordUpdateResult, error) {
	if update == nil {
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "miniblock update is nil"),
		}, nil
	}
	if update.LastMiniblock.Num < 0 {
		return streamRecordUpdateResult{
			validationErr: RiverError(protocol.Err_INVALID_ARGUMENT, "last_miniblock_num must be non-negative"),
		}, nil
	}

	record, err := s.getStreamRecordForUpdateTx(ctx, tx, update.StreamId)
	if err != nil {
		if AsRiverError(err).Code == protocol.Err_NOT_FOUND {
			return streamRecordUpdateResult{
				insertionErr: err,
			}, nil
		}
		return streamRecordUpdateResult{}, err
	}

	if record.Sealed {
		return streamRecordUpdateResult{
			insertionErr: RiverError(protocol.Err_FAILED_PRECONDITION, "stream is sealed", "streamId", update.StreamId),
		}, nil
	}
	if record.LastMiniblock.Hash != update.PrevMiniblock.Hash {
		return streamRecordUpdateResult{
			insertionErr: RiverError(
				protocol.Err_BAD_PREV_MINIBLOCK_HASH,
				"prev_miniblock_hash mismatch",
				"streamId", update.StreamId,
			),
		}, nil
	}
	if record.LastMiniblock.Num+1 != update.LastMiniblock.Num {
		return streamRecordUpdateResult{
			insertionErr: RiverError(
				protocol.Err_BAD_BLOCK_NUMBER,
				"last_miniblock_num must increase by 1",
				"streamId", update.StreamId,
			),
		}, nil
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
		update.LastMiniblock.Hash.Bytes(),
		update.LastMiniblock.Num,
		sealed,
		blockNum,
	); err != nil {
		return streamRecordUpdateResult{}, err
	}

	record.LastMiniblock = update.LastMiniblock
	record.Sealed = sealed
	record.UpdatedAtBlock = blockNum

	mask := StreamRecordEventMaskLastMiniblock
	if update.Sealed {
		mask |= StreamRecordEventMaskSealed
	}

	return streamRecordUpdateResult{
		record: record,
		mask:   mask,
	}, nil
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

func (s *PostgresMetadataServiceStore) GetLastRecordBlockNum(ctx context.Context) (int64, error) {
	var blockNum int64
	err := s.txRunner(
		ctx,
		"MetadataService.GetLastRecordBlockNum",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(
				ctx,
				`SELECT block_num FROM md_last_block WHERE singleton_key = TRUE`,
			).Scan(&blockNum)
		},
		nil,
	)
	return blockNum, err
}

func (s *PostgresMetadataServiceStore) OnNewRecordBlock(
	ctx context.Context,
	timeout time.Duration,
) (<-chan int64, <-chan error) {
	updates := make(chan int64, 1)
	errs := make(chan error, 1)

	go s.listenForRecordBlocks(ctx, timeout, updates, errs)

	return updates, errs
}

func (s *PostgresMetadataServiceStore) listenForRecordBlocks(
	ctx context.Context,
	timeout time.Duration,
	updates chan<- int64,
	errs chan<- error,
) {
	defer close(updates)
	defer close(errs)

	conn, err := s.acquireRecordBlockListener(ctx, timeout)
	if err != nil {
		s.sendListenerError(errs, err)
		return
	}
	defer func() {
		if conn != nil {
			conn.Release()
		}
	}()

	for {
		notification, err := conn.Conn().WaitForNotification(ctx)
		if err == nil {
			blockNum, err := s.parseRecordBlockNotification(ctx, notification.Payload)
			if err != nil {
				s.sendListenerError(errs, err)
				return
			}
			select {
			case updates <- blockNum:
			case <-ctx.Done():
				return
			}
			continue
		}

		if errors.Is(err, context.Canceled) {
			return
		}

		conn.Release()
		conn = nil

		conn, err = s.acquireRecordBlockListener(ctx, timeout)
		if err != nil {
			s.sendListenerError(errs, err)
			return
		}
	}
}

func (s *PostgresMetadataServiceStore) acquireRecordBlockListener(
	ctx context.Context,
	timeout time.Duration,
) (*pgxpool.Conn, error) {
	attemptCtx := ctx
	var cancel context.CancelFunc
	if timeout > 0 {
		attemptCtx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	var backoff BackoffTracker
	for {
		conn, err := s.pool.Acquire(attemptCtx)
		if err == nil {
			if _, err = conn.Exec(attemptCtx, "listen "+metadataRecordBlockNotifyChannel); err == nil {
				return conn, nil
			}
			conn.Release()
		}

		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, err
		}

		if waitErr := backoff.Wait(attemptCtx, err); waitErr != nil {
			return nil, waitErr
		}
	}
}

func (s *PostgresMetadataServiceStore) parseRecordBlockNotification(
	ctx context.Context,
	payload string,
) (int64, error) {
	if payload == "" {
		blockNum, err := s.GetLastRecordBlockNum(ctx)
		if err != nil {
			return 0, err
		}
		return blockNum, nil
	}

	blockNum, err := strconv.ParseInt(payload, 10, 64)
	if err != nil {
		blockNum, lastErr := s.GetLastRecordBlockNum(ctx)
		if lastErr != nil {
			return 0, RiverErrorWithBase(
				protocol.Err_INVALID_ARGUMENT,
				"invalid block notification payload",
				err,
				"payload",
				payload,
			).Func("parseRecordBlockNotification")
		}
		return blockNum, nil
	}
	return blockNum, nil
}

func (*PostgresMetadataServiceStore) sendListenerError(errs chan<- error, err error) {
	if err == nil {
		return
	}
	select {
	case errs <- err:
	default:
	}
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
					StreamId: streamId,
					LastMiniblock: shared.MiniblockRef{
						Hash: common.BytesToHash(lastHash),
						Num:  lastNum,
					},
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
		StreamId: streamId,
		LastMiniblock: shared.MiniblockRef{
			Hash: common.BytesToHash(lastHash),
			Num:  lastNum,
		},
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
		record.LastMiniblock.Hash.Bytes(),
		record.LastMiniblock.Num,
		record.NodeIndexes,
		record.ReplicationFactor,
		record.Sealed,
	)
	return err
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
