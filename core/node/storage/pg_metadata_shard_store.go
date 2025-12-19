package storage

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"slices"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/metadata/mdstate"
	nodespkg "github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// MetadataShardsState captures persisted shard info used by ABCI commit.
type MetadataShardState struct {
	LastHeight  int64
	LastAppHash []byte
}

type PostgresMetadataShardStore struct {
	store    *PostgresEventStore
	registry nodespkg.NodeRegistry
}

type MetadataStore interface {
	EnsureShardStorage(ctx context.Context, shardId uint64) error

	GetStream(ctx context.Context, shardId uint64, streamId shared.StreamId) (*StreamMetadata, error)
	ListStreams(ctx context.Context, shardId uint64, offset int64, limit int32) ([]*StreamMetadata, error)
	ListStreamsByNode(
		ctx context.Context,
		shardId uint64,
		node common.Address,
		offset int64,
		limit int32,
	) ([]*StreamMetadata, error)
	CountStreams(ctx context.Context, shardId uint64) (int64, error)
	CountStreamsByNode(ctx context.Context, shardId uint64, node common.Address) (int64, error)
	GetShardState(ctx context.Context, shardId uint64) (*MetadataShardState, error)
	GetStreamsStateSnapshot(ctx context.Context, shardId uint64) ([]*StreamMetadata, error)

	PreparePendingBlock(ctx context.Context, shardId uint64, pendingBlock *mdstate.PendingBlockState) error
	CommitPendingBlock(ctx context.Context, shardId uint64, pendingBlock *mdstate.PendingBlockState) error
}

var _ MetadataStore = (*PostgresMetadataShardStore)(nil)

// NewPostgresMetadataShardStore instantiates a new metadata shard store for the given shard ID,
// sharing the provided PostgresEventStore (typically from PostgresStreamStore) and schema.
func NewPostgresMetadataShardStore(
	ctx context.Context,
	eventStore *PostgresEventStore,
	shardId uint64,
	registry nodespkg.NodeRegistry,
) (*PostgresMetadataShardStore, error) {
	if eventStore == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "eventStore is required")
	}
	if registry == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "node registry is required")
	}

	store := &PostgresMetadataShardStore{
		store:    eventStore,
		registry: registry,
	}

	if err := store.EnsureShardStorage(ctx, shardId); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresMetadataShardStore")
	}

	return store, nil
}

// Close is a no-op to avoid shutting down the shared PostgresEventStore.
func (*PostgresMetadataShardStore) Close(context.Context) {}

// sqlForShard replaces placeholders with shard-specific table names.
// Supported placeholders: {{streams}}.
func (s *PostgresMetadataShardStore) sqlForShard(template string, shardId uint64) string {
	streams := fmt.Sprintf("md_%04x_s", shardId)

	replacer := strings.NewReplacer(
		"{{streams}}", streams,
	)
	return replacer.Replace(template)
}

func (s *PostgresMetadataShardStore) EnsureShardStorage(ctx context.Context, shardId uint64) error {
	return s.store.txRunner(
		ctx,
		"EnsureMetadataShardStorage",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.ensureShardStorageTx(ctx, tx, shardId)
		},
		nil,
		"shardId", shardId,
	)
}

func (s *PostgresMetadataShardStore) ensureShardStorageTx(ctx context.Context, tx pgx.Tx, shardId uint64) error {
	if _, err := tx.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS metadata (
			shard_id BIGINT PRIMARY KEY,
			last_height BIGINT NOT NULL DEFAULT 0,
			last_app_hash BYTEA NOT NULL DEFAULT ''::BYTEA,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`); err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
			Message("failed to create metadata state table").
			Tag("shardId", shardId)
	}

	if _, err := tx.Exec(ctx, s.sqlForShard(`
			CREATE TABLE IF NOT EXISTS {{streams}} (
				stream_id BYTEA PRIMARY KEY,
				last_miniblock_hash BYTEA NOT NULL,
				last_miniblock_num BIGINT NOT NULL,
				replication_factor INT NOT NULL,
				sealed BOOLEAN NOT NULL DEFAULT FALSE,
				nodes INT[] NOT NULL,
				CHECK (octet_length(stream_id) = 32),
				CHECK (octet_length(last_miniblock_hash) = 32),
				CHECK (last_miniblock_num >= 0),
				CHECK (replication_factor > 0),
				CHECK (array_length(nodes, 1) > 0)
			)`, shardId)); err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
			Message("failed to create streams table").
			Tag("shardId", shardId)
	}
	if _, err := tx.Exec(ctx, s.sqlForShard(`
			ALTER TABLE {{streams}}
				DROP COLUMN IF EXISTS genesis_miniblock_hash,
				DROP COLUMN IF EXISTS genesis_miniblock
		`, shardId)); err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
			Message("failed to update streams table").
			Tag("shardId", shardId)
	}
	if _, err := tx.Exec(ctx, s.sqlForShard(
		`CREATE INDEX IF NOT EXISTS {{streams}}_nodes_gin_idx ON {{streams}} USING GIN (nodes)`,
		shardId,
	)); err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
			Message("failed to create streams nodes GIN index").
			Tag("shardId", shardId)
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO metadata (shard_id, last_height, last_app_hash) VALUES ($1, 0, ''::BYTEA) ON CONFLICT DO NOTHING`,
		int64(shardId),
	); err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
			Message("failed to seed metadata shard state").
			Tag("shardId", shardId)
	}

	return nil
}

func (s *PostgresMetadataShardStore) nodeIndexesForAddrs(nodes [][]byte, allowEmpty bool) ([]int32, error) {
	if len(nodes) == 0 {
		if allowEmpty {
			return nil, nil
		}
		return nil, RiverError(Err_INVALID_ARGUMENT, "nodes must not be empty")
	}
	indexes := make([]int32, 0, len(nodes))
	for _, nodeBytes := range nodes {
		if len(nodeBytes) != 20 {
			return nil, RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes")
		}
		addr := common.BytesToAddress(nodeBytes)
		record, err := s.registry.GetNode(addr)
		if err != nil {
			return nil, err
		}
		idx := record.PermanentIndex()
		if idx <= 0 {
			return nil, RiverError(Err_INTERNAL, "invalid permanent index", "node", addr, "index", idx)
		}
		if slices.Contains(indexes, int32(idx)) {
			return nil, RiverError(
				Err_INVALID_ARGUMENT,
				"node list cannot contain duplicates",
				"node",
				addr,
				"index",
				idx,
			)
		}
		indexes = append(indexes, int32(idx))
	}
	return indexes, nil
}

func (s *PostgresMetadataShardStore) nodeAddrsForIndexes(indexes []int32) ([][]byte, error) {
	addrs := make([][]byte, 0, len(indexes))
	for _, idx := range indexes {
		if idx <= 0 {
			return nil, RiverError(Err_INVALID_ARGUMENT, "node index must be positive", "index", idx)
		}
		record, err := s.registry.GetNodeByPermanentIndex(idx)
		if err != nil {
			return nil, err
		}
		addrBytes := record.Address().Bytes()
		cp := make([]byte, len(addrBytes))
		copy(cp, addrBytes)
		addrs = append(addrs, cp)
	}
	return addrs, nil
}

func (s *PostgresMetadataShardStore) GetStream(
	ctx context.Context,
	shardID uint64,
	streamId shared.StreamId,
) (*StreamMetadata, error) {
	var record *StreamMetadata
	err := s.store.txRunner(
		ctx,
		"MetadataShard.GetStream",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			r, innerErr := s.getStreamTx(ctx, tx, shardID, streamId)
			if innerErr != nil {
				return innerErr
			}
			record = r
			return nil
		},
		&txRunnerOpts{skipLoggingNotFound: true},
		"shardId", shardID,
		"streamId", streamId,
	)
	return record, err
}

func (s *PostgresMetadataShardStore) getStreamTx(
	ctx context.Context,
	tx pgx.Tx,
	shardID uint64,
	streamId shared.StreamId,
) (*StreamMetadata, error) {
	var (
		lastHash    []byte
		lastNum     int64
		repFactor   uint32
		sealed      bool
		nodeIndexes []int32
	)

	query := s.sqlForShard(
		`SELECT last_miniblock_hash,
                last_miniblock_num,
                replication_factor,
                sealed,
                nodes
         FROM {{streams}}
         WHERE stream_id = $1`,
		shardID,
	)

	if err := tx.QueryRow(ctx, query, streamId[:]).Scan(
		&lastHash,
		&lastNum,
		&repFactor,
		&sealed,
		&nodeIndexes,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, RiverError(Err_NOT_FOUND, "stream not found", "streamId", streamId)
		}
		return nil, err
	}

	nodesAddrs, err := s.nodeAddrsForIndexes(nodeIndexes)
	if err != nil {
		return nil, err
	}

	return &StreamMetadata{
		StreamId:          streamId[:],
		LastMiniblockHash: lastHash,
		LastMiniblockNum:  lastNum,
		Nodes:             nodesAddrs,
		ReplicationFactor: repFactor,
		Sealed:            sealed,
	}, nil
}

func (s *PostgresMetadataShardStore) ListStreams(
	ctx context.Context,
	shardID uint64,
	offset int64,
	limit int32,
) ([]*StreamMetadata, error) {
	var records []*StreamMetadata
	err := s.store.txRunner(
		ctx,
		"MetadataShard.ListStreams",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			rows, err := tx.Query(
				ctx,
				s.sqlForShard(
					`SELECT s.stream_id,
	                            s.last_miniblock_hash,
	                            s.last_miniblock_num,
	                            s.replication_factor,
	                            s.sealed,
	                            s.nodes
	                     FROM {{streams}} s
	                     ORDER BY s.stream_id
	                     OFFSET $1 LIMIT $2`,
					shardID,
				),
				offset,
				limit,
			)
			if err != nil {
				return err
			}
			defer rows.Close()

			for rows.Next() {
				var (
					streamId    []byte
					lastHash    []byte
					lastNum     int64
					repFactor   uint32
					sealed      bool
					nodeIndexes []int32
				)
				if err := rows.Scan(
					&streamId,
					&lastHash,
					&lastNum,
					&repFactor,
					&sealed,
					&nodeIndexes,
				); err != nil {
					return err
				}

				nodesAddrs, err := s.nodeAddrsForIndexes(nodeIndexes)
				if err != nil {
					return err
				}

				records = append(records, &StreamMetadata{
					StreamId:          streamId,
					LastMiniblockHash: lastHash,
					LastMiniblockNum:  lastNum,
					Nodes:             nodesAddrs,
					ReplicationFactor: repFactor,
					Sealed:            sealed,
				})
			}
			return rows.Err()
		},
		nil,
		"shardId", shardID,
	)
	return records, err
}

func (s *PostgresMetadataShardStore) ListStreamsByNode(
	ctx context.Context,
	shardID uint64,
	node common.Address,
	offset int64,
	limit int32,
) ([]*StreamMetadata, error) {
	var records []*StreamMetadata
	err := s.store.txRunner(
		ctx,
		"MetadataShard.ListStreamsByNode",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			record, err := s.registry.GetNode(node)
			if err != nil {
				return err
			}
			nodeIndex := record.PermanentIndex()
			if nodeIndex <= 0 {
				return RiverError(Err_INTERNAL, "invalid permanent index", "node", node, "index", nodeIndex)
			}
			rows, err := tx.Query(
				ctx,
				s.sqlForShard(
					`SELECT s.stream_id,
	                            s.last_miniblock_hash,
	                            s.last_miniblock_num,
	                            s.replication_factor,
	                            s.sealed,
	                            s.nodes
	                     FROM {{streams}} s
	                     WHERE s.nodes @> ARRAY[$1]::int[]
	                     ORDER BY s.stream_id
	                     OFFSET $2 LIMIT $3`,
					shardID,
				),
				int32(nodeIndex),
				offset,
				limit,
			)
			if err != nil {
				return err
			}
			defer rows.Close()

			for rows.Next() {
				var (
					streamId    []byte
					lastHash    []byte
					lastNum     int64
					repFactor   uint32
					sealed      bool
					nodeIndexes []int32
				)
				if err := rows.Scan(
					&streamId,
					&lastHash,
					&lastNum,
					&repFactor,
					&sealed,
					&nodeIndexes,
				); err != nil {
					return err
				}

				nodesAddrs, err := s.nodeAddrsForIndexes(nodeIndexes)
				if err != nil {
					return err
				}

				records = append(records, &StreamMetadata{
					StreamId:          streamId,
					LastMiniblockHash: lastHash,
					LastMiniblockNum:  lastNum,
					Nodes:             nodesAddrs,
					ReplicationFactor: repFactor,
					Sealed:            sealed,
				})
			}
			return rows.Err()
		},
		nil,
		"shardId", shardID,
		"node", node,
	)
	return records, err
}

func (s *PostgresMetadataShardStore) CountStreams(ctx context.Context, shardID uint64) (int64, error) {
	var count int64
	err := s.store.txRunner(
		ctx,
		"MetadataShard.CountStreams",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(ctx, s.sqlForShard(`SELECT COUNT(*) FROM {{streams}}`, shardID)).Scan(&count)
		},
		nil,
		"shardId", shardID,
	)
	return count, err
}

func (s *PostgresMetadataShardStore) CountStreamsByNode(
	ctx context.Context,
	shardID uint64,
	node common.Address,
) (int64, error) {
	var count int64
	err := s.store.txRunner(
		ctx,
		"MetadataShard.CountStreamsByNode",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			record, err := s.registry.GetNode(node)
			if err != nil {
				return err
			}
			nodeIndex := record.PermanentIndex()
			if nodeIndex <= 0 {
				return RiverError(Err_INTERNAL, "invalid permanent index", "node", node, "index", nodeIndex)
			}
			return tx.QueryRow(
				ctx,
				s.sqlForShard(`SELECT COUNT(*) FROM {{streams}} WHERE nodes @> ARRAY[$1]::int[]`, shardID),
				int32(nodeIndex),
			).Scan(&count)
		},
		nil,
		"shardId", shardID,
		"node", node,
	)
	return count, err
}

func (s *PostgresMetadataShardStore) SetShardState(
	ctx context.Context,
	shardID uint64,
	height int64,
	appHash []byte,
) error {
	if appHash == nil {
		appHash = []byte{}
	}
	return s.store.txRunner(
		ctx,
		"MetadataShard.SetShardState",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			updateSQL := `UPDATE metadata SET last_height = $1, last_app_hash = $2 WHERE shard_id = $3`
			if _, err := tx.Exec(ctx, updateSQL, height, appHash, shardID); err != nil {
				return err
			}
			return nil
		},
		nil,
		"shardId", shardID,
		"height", height,
	)
}

func (s *PostgresMetadataShardStore) GetShardState(ctx context.Context, shardID uint64) (*MetadataShardState, error) {
	state := &MetadataShardState{}
	err := s.store.txRunner(
		ctx,
		"MetadataShard.GetShardState",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			query := `SELECT last_height, last_app_hash FROM metadata WHERE shard_id = $1`
			return tx.QueryRow(ctx, query, shardID).Scan(&state.LastHeight, &state.LastAppHash)
		},
		nil,
		"shardId", shardID,
	)
	return state, err
}

func (s *PostgresMetadataShardStore) GetStreamsStateSnapshot(
	ctx context.Context,
	shardID uint64,
) ([]*StreamMetadata, error) {
	var records []*StreamMetadata
	err := s.store.txRunner(
		ctx,
		"MetadataShard.GetStreamsStateSnapshot",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			rows, err := tx.Query(
				ctx,
				s.sqlForShard(
					`SELECT s.stream_id,
	                            s.last_miniblock_hash,
	                            s.last_miniblock_num,
	                            s.replication_factor,
	                            s.sealed,
	                            s.nodes
	                     FROM {{streams}} s
	                     ORDER BY s.stream_id`,
					shardID,
				),
			)
			if err != nil {
				return err
			}
			defer rows.Close()

			for rows.Next() {
				var (
					streamID    []byte
					lastHash    []byte
					lastNum     int64
					repFactor   uint32
					sealed      bool
					nodeIndexes []int32
				)
				if err := rows.Scan(
					&streamID,
					&lastHash,
					&lastNum,
					&repFactor,
					&sealed,
					&nodeIndexes,
				); err != nil {
					return err
				}

				nodesAddrs, err := s.nodeAddrsForIndexes(nodeIndexes)
				if err != nil {
					return err
				}

				records = append(records, &StreamMetadata{
					StreamId:          streamID,
					LastMiniblockHash: lastHash,
					LastMiniblockNum:  lastNum,
					Nodes:             nodesAddrs,
					ReplicationFactor: repFactor,
					Sealed:            sealed,
				})
			}

			return rows.Err()
		},
		nil,
		"shardId", shardID,
	)
	return records, err
}

func (s *PostgresMetadataShardStore) PreparePendingBlock(
	ctx context.Context,
	shardId uint64,
	pendingBlock *mdstate.PendingBlockState,
) error {
	return s.store.txRunner(
		ctx,
		"MetadataShard.PreparePendingBlock",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.preparePendingBlockTx(ctx, tx, shardId, pendingBlock)
		},
		nil,
		"shardId", shardId,
		"height", pendingBlock.Height,
	)
}

func (s *PostgresMetadataShardStore) preparePendingBlockTx(
	ctx context.Context,
	tx pgx.Tx,
	shardId uint64,
	pendingBlock *mdstate.PendingBlockState,
) error {
	batch := &pgx.Batch{}

	// Check height matches last height + 1
	batch.Queue(`SELECT last_height FROM metadata WHERE shard_id = $1`, shardId).
		QueryRow(func(row pgx.Row) error {
			var lastHeight int64
			if err := row.Scan(&lastHeight); err != nil {
				return err
			}
			if lastHeight+1 != pendingBlock.Height {
				return RiverError(
					Err_FAILED_PRECONDITION,
					"height mismatch",
					"lastHeight",
					lastHeight,
					"pendingHeight",
					pendingBlock.Height,
				)
			}
			return nil
		})

	for i, blockTx := range pendingBlock.Txs {
		if blockTx == nil {
			continue
		}

		switch op := blockTx.Op.(type) {
		case *MetadataTx_CreateStream:
			s.batchValidateCreateStreamTx(batch, shardId, pendingBlock, i, op.CreateStream)
		case *MetadataTx_SetStreamLastMiniblockBatch:
			for j, mb := range op.SetStreamLastMiniblockBatch.Miniblocks {
				s.batchValidateMbUpdateTx(batch, shardId, pendingBlock, i, j, mb)
			}
		case *MetadataTx_UpdateStreamNodesAndReplication:
			s.batchValidateUpdateStreamNodesAndReplicationTx(batch, shardId, pendingBlock, i, op.UpdateStreamNodesAndReplication)
		default:
			return RiverError(Err_INTERNAL, "unknown operation, should not happen", "operation", blockTx.Op)
		}
	}

	err := tx.SendBatch(ctx, batch).Close()
	if err != nil {
		return err
	}

	// Compute fake app hash. TODO: replace with merkle root.
	hasher := sha256.New()
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], uint64(pendingBlock.Height))
	_, _ = hasher.Write(buf[:])
	pendingBlock.AppHash = hasher.Sum(nil)
	return nil
}

func (s *PostgresMetadataShardStore) batchValidateCreateStreamTx(
	batch *pgx.Batch,
	shardId uint64,
	pendingBlock *mdstate.PendingBlockState,
	index int,
	op *CreateStreamTx,
) {
	if op == nil || op.Stream == nil {
		pendingBlock.SetTxError(index, RiverError(Err_INVALID_ARGUMENT, "stream metadata missing"))
		return
	}
	stream := op.Stream
	streamId, err := shared.StreamIdFromBytes(stream.StreamId)
	if err != nil {
		pendingBlock.SetTxError(index, err)
		return
	}

	_, err = s.nodeIndexesForAddrs(stream.Nodes, false)
	if err != nil {
		pendingBlock.SetTxError(index, err)
		return
	}

	batch.Queue(
		s.sqlForShard(
			`SELECT EXISTS (
				SELECT 1
				FROM {{streams}}
				WHERE stream_id = $1
			) AS stream_exists`,
			shardId),
		streamId[:],
	).QueryRow(func(row pgx.Row) error {
		var streamExists bool
		if err := row.Scan(&streamExists); err != nil {
			return err
		}
		if streamExists {
			pendingBlock.SetTxErrorCode(index, Err_ALREADY_EXISTS)
			return nil
		}
		if pendingBlock.CreatedStreams[streamId] != nil {
			pendingBlock.SetTxErrorCode(index, Err_ALREADY_EXISTS)
			return nil
		}
		pendingBlock.CreatedStreams[streamId] = op
		pendingBlock.SetSuccess(index)
		return nil
	})
}

func (s *PostgresMetadataShardStore) batchValidateMbUpdateTx(
	batch *pgx.Batch,
	shardId uint64,
	pendingBlock *mdstate.PendingBlockState,
	txIndex int,
	mbIndex int,
	op *MiniblockUpdate,
) {
	streamId, err := shared.StreamIdFromBytes(op.StreamId)
	if err != nil {
		pendingBlock.SetMbErrorEvent(txIndex, mbIndex, streamId, Err_BAD_STREAM_ID, "can't parse stream id")
		return
	}

	batch.Queue(
		s.sqlForShard(
			`SELECT last_miniblock_hash,
                last_miniblock_num,
                sealed
         FROM {{streams}}
         WHERE stream_id = $1`,
			shardId),
		streamId[:],
	).QueryRow(func(row pgx.Row) error {
		var prevHash []byte
		var prevNum int64
		var sealed bool
		if err := row.Scan(&prevHash, &prevNum, &sealed); err != nil {
			if err == pgx.ErrNoRows {
				pendingBlock.SetMbErrorEvent(txIndex, mbIndex, streamId, Err_NOT_FOUND, "stream not found")
				return nil
			}
			return err
		}
		if pendingBlock.UpdatedMiniblocks[streamId] != nil {
			pendingBlock.SetMbErrorEvent(
				txIndex,
				mbIndex,
				streamId,
				Err_FAILED_PRECONDITION, // TODO: introduce Err_DUPLICATE_MINIBLOCK_UPDATE
				"can't update miniblock twice in the same block",
			)
			return nil
		}
		if sealed {
			pendingBlock.SetMbErrorEvent(
				txIndex,
				mbIndex,
				streamId,
				Err_FAILED_PRECONDITION,
				"stream is sealed",
			) // TODO: introduce Err_STREAM_SEALED
			return nil
		}
		if !bytes.Equal(prevHash, op.PrevMiniblockHash) {
			pendingBlock.SetMbErrorEvent(
				txIndex,
				mbIndex,
				streamId,
				Err_BAD_PREV_MINIBLOCK_HASH,
				"prev_miniblock_hash mismatch",
			)
			return nil
		}
		if prevNum+1 != op.LastMiniblockNum {
			pendingBlock.SetMbErrorEvent(
				txIndex,
				mbIndex,
				streamId,
				Err_BAD_BLOCK_NUMBER,
				"last_miniblock_num must increase by 1",
			)
			return nil
		}

		pendingBlock.UpdatedMiniblocks[streamId] = op
		pendingBlock.SetMbStatusEvent(txIndex, mbIndex, streamId, op.LastMiniblockNum, op.LastMiniblockHash, op.Sealed)
		return nil
	})
}

func (s *PostgresMetadataShardStore) batchValidateUpdateStreamNodesAndReplicationTx(
	batch *pgx.Batch,
	shardId uint64,
	pendingBlock *mdstate.PendingBlockState,
	txIndex int,
	op *UpdateStreamNodesAndReplicationTx,
) {
	streamId, err := shared.StreamIdFromBytes(op.StreamId)
	if err != nil {
		pendingBlock.SetTxError(txIndex, err)
		return
	}

	_, err = s.nodeIndexesForAddrs(op.Nodes, true)
	if err != nil {
		pendingBlock.SetTxError(txIndex, err)
		return
	}

	batch.Queue(
		s.sqlForShard(
			`SELECT
			  replication_factor,
			  array_length(nodes, 1) AS num_nodes
			FROM {{streams}}
			WHERE stream_id = $1`,
			shardId),
		streamId[:],
	).QueryRow(func(row pgx.Row) error {
		var prevRepl uint32
		var prevNumNodes int
		if err := row.Scan(&prevRepl, &prevNumNodes); err != nil {
			if err == pgx.ErrNoRows {
				pendingBlock.SetTxErrorCode(txIndex, Err_NOT_FOUND)
				return nil
			}
			return err
		}

		if pendingBlock.UpdatedStreams[streamId] != nil {
			pendingBlock.SetTxErrorCode(txIndex, Err_FAILED_PRECONDITION)
			return nil
		}

		switch {
		case op.ReplicationFactor > 0 && len(op.Nodes) > 0:
			if int(op.ReplicationFactor) > len(op.Nodes) {
				pendingBlock.SetTxErrorCode(txIndex, Err_INVALID_ARGUMENT)
				return nil
			}
		case op.ReplicationFactor > 0:
			if int(op.ReplicationFactor) > prevNumNodes {
				pendingBlock.SetTxErrorCode(txIndex, Err_INVALID_ARGUMENT)
				return nil
			}
		case len(op.Nodes) > 0:
			if len(op.Nodes) < int(prevRepl) {
				pendingBlock.SetTxErrorCode(txIndex, Err_INVALID_ARGUMENT)
				return nil
			}
		}

		pendingBlock.UpdatedStreams[streamId] = op
		pendingBlock.SetSuccess(txIndex)
		return nil
	})
}

func (s *PostgresMetadataShardStore) CommitPendingBlock(
	ctx context.Context,
	shardId uint64,
	pendingBlock *mdstate.PendingBlockState,
) error {
	return s.store.txRunner(
		ctx,
		"MetadataShard.CommitBlock",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.commitPendingBlockTx(ctx, tx, shardId, pendingBlock)
		},
		nil,
		"shardId", shardId,
		"height", pendingBlock.Height,
	)
}

func (s *PostgresMetadataShardStore) commitPendingBlockTx(
	ctx context.Context,
	tx pgx.Tx,
	shardId uint64,
	pendingBlock *mdstate.PendingBlockState,
) error {
	batch := &pgx.Batch{}

	// Validate height matches last height + 1 and update last height and app hash
	batch.Queue(`SELECT last_height FROM metadata WHERE shard_id = $1 FOR UPDATE`, shardId).
		QueryRow(func(row pgx.Row) error {
			var lastHeight int64
			if err := row.Scan(&lastHeight); err != nil {
				return err
			}
			if lastHeight+1 != pendingBlock.Height {
				return RiverError(
					Err_FAILED_PRECONDITION,
					"height mismatch",
					"lastHeight",
					lastHeight,
					"pendingHeight",
					pendingBlock.Height,
				).Func("commitPendingBlockTx")
			}
			return nil
		})
	batch.Queue(
		`UPDATE metadata SET last_height = $1, last_app_hash = $2 WHERE shard_id = $3`,
		pendingBlock.Height,
		pendingBlock.AppHash,
		shardId,
	)

	for _, createOp := range pendingBlock.CreatedStreams {
		if err := s.batchCreateStreamTx(batch, shardId, createOp); err != nil {
			return err
		}
	}
	for _, updateOp := range pendingBlock.UpdatedStreams {
		if err := s.batchUpdateStreamNodesAndReplicationTx(batch, shardId, updateOp); err != nil {
			return err
		}
	}
	for _, updateOp := range pendingBlock.UpdatedMiniblocks {
		if err := s.batchUpdateMiniblockTx(batch, shardId, updateOp); err != nil {
			return err
		}
	}

	return tx.SendBatch(ctx, batch).Close()
}

func (s *PostgresMetadataShardStore) batchCreateStreamTx(
	batch *pgx.Batch,
	shardId uint64,
	op *CreateStreamTx,
) error {
	if op == nil || op.Stream == nil {
		return RiverError(Err_INVALID_ARGUMENT, "stream metadata missing")
	}
	stream := op.Stream
	nodeIndexes, err := s.nodeIndexesForAddrs(stream.Nodes, false)
	if err != nil {
		return err
	}

	batch.Queue(
		s.sqlForShard(
			`INSERT INTO {{streams}} (stream_id, last_miniblock_hash, last_miniblock_num, replication_factor, sealed, nodes) VALUES ($1,$2,$3,$4,$5,$6)`,
			shardId,
		),
		stream.StreamId,
		stream.LastMiniblockHash,
		stream.LastMiniblockNum,
		stream.ReplicationFactor,
		stream.Sealed,
		nodeIndexes,
	)
	return nil
}

func (s *PostgresMetadataShardStore) batchUpdateStreamNodesAndReplicationTx(
	batch *pgx.Batch,
	shardId uint64,
	op *UpdateStreamNodesAndReplicationTx,
) error {
	nodeIndexes, err := s.nodeIndexesForAddrs(op.Nodes, true)
	if err != nil {
		return err
	}

	switch {
	case op.ReplicationFactor > 0 && len(op.Nodes) > 0:
		batch.Queue(
			s.sqlForShard(
				`UPDATE {{streams}}
				SET replication_factor = $2,
					nodes = $3
				WHERE stream_id = $1`,
				shardId,
			),
			op.StreamId,
			op.ReplicationFactor,
			nodeIndexes,
		)

	case op.ReplicationFactor > 0:
		batch.Queue(
			s.sqlForShard(
				`UPDATE {{streams}}
				SET replication_factor = $2
				WHERE stream_id = $1`,
				shardId,
			),
			op.StreamId,
			op.ReplicationFactor,
		)
	case len(op.Nodes) > 0:
		batch.Queue(
			s.sqlForShard(
				`UPDATE {{streams}}
			SET nodes = $2
			WHERE stream_id = $1`,
				shardId,
			),
			op.StreamId,
			nodeIndexes,
		)
	}
	return nil
}

func (s *PostgresMetadataShardStore) batchUpdateMiniblockTx(
	batch *pgx.Batch,
	shardId uint64,
	op *MiniblockUpdate,
) error {
	if op.Sealed {
		batch.Queue(
			s.sqlForShard(
				`UPDATE {{streams}}
				SET last_miniblock_hash = $2,
					last_miniblock_num = $3,
					sealed = $4
				WHERE stream_id = $1`,
				shardId,
			),
			op.StreamId,
			op.LastMiniblockHash,
			op.LastMiniblockNum,
			op.Sealed,
		)
	} else {
		batch.Queue(
			s.sqlForShard(
				`UPDATE {{streams}}
				SET last_miniblock_hash = $2,
					last_miniblock_num = $3
				WHERE stream_id = $1`,
				shardId,
			),
			op.StreamId,
			op.LastMiniblockHash,
			op.LastMiniblockNum,
		)
	}
	return nil
}
