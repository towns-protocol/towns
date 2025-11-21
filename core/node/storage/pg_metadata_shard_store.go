package storage

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
)

//go:embed metadata_shard_migrations/*.sql
var metadataShardMigrationsDir embed.FS

// MetadataShardState captures persisted shard info used by ABCI commit.
type MetadataShardState struct {
	LastHeight  int64
	LastAppHash []byte
}

type PostgresMetadataShardStore struct {
	PostgresEventStore

	shardID uint64

	streamsTable string
	nodesTable   string
	stateTable   string
	txLogTable   string
}

var _ interface {
	EnsureShardStorage(ctx context.Context) error
	CreateStream(ctx context.Context, height int64, tx *protocol.CreateStreamTx) (*protocol.StreamMetadata, error)
	ApplyMiniblockBatch(ctx context.Context, height int64, updates []*protocol.MiniblockUpdate) error
	UpdateStreamNodesAndReplication(
		ctx context.Context,
		height int64,
		update *protocol.UpdateStreamNodesAndReplicationTx,
	) (*protocol.StreamMetadata, error)
	GetStream(ctx context.Context, streamID []byte) (*protocol.StreamMetadata, error)
	ListStreams(ctx context.Context, offset int64, limit int32) ([]*protocol.StreamMetadata, error)
	ListStreamsByNode(ctx context.Context, node []byte, offset int64, limit int32) ([]*protocol.StreamMetadata, error)
	CountStreams(ctx context.Context) (int64, error)
	CountStreamsByNode(ctx context.Context, node []byte) (int64, error)
	SetShardState(ctx context.Context, height int64, appHash []byte) error
	GetShardState(ctx context.Context) (*MetadataShardState, error)
	GetStreamsStateSnapshot(ctx context.Context) ([]*protocol.StreamMetadata, error)
} = (*PostgresMetadataShardStore)(nil)

// NewPostgresMetadataShardStore instantiates a new metadata shard store for the given shard ID.
func NewPostgresMetadataShardStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	metrics infra.MetricsFactory,
	shardID uint64,
) (*PostgresMetadataShardStore, error) {
	store := &PostgresMetadataShardStore{
		shardID: shardID,
	}
	store.setTableNames()

	if err := store.PostgresEventStore.init(
		ctx,
		poolInfo,
		metrics,
		nil,
		&metadataShardMigrationsDir,
		"metadata_shard_migrations",
	); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresMetadataShardStore")
	}

	if err := store.EnsureShardStorage(ctx); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresMetadataShardStore")
	}

	return store, nil
}

func (s *PostgresMetadataShardStore) setTableNames() {
	prefix := fmt.Sprintf("msh_%016x", s.shardID)
	s.streamsTable = fmt.Sprintf("%s_streams", prefix)
	s.nodesTable = fmt.Sprintf("%s_stream_nodes", prefix)
	s.stateTable = fmt.Sprintf("%s_state", prefix)
	s.txLogTable = fmt.Sprintf("%s_tx_log", prefix)
}

func (s *PostgresMetadataShardStore) EnsureShardStorage(ctx context.Context) error {
	return s.txRunner(
		ctx,
		"EnsureMetadataShardStorage",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.ensureShardStorageTx(ctx, tx)
		},
		nil,
		"shardId", s.shardID,
	)
}

func (s *PostgresMetadataShardStore) ensureShardStorageTx(ctx context.Context, tx pgx.Tx) error {
	log := logging.FromCtx(ctx)

	streamsSQL := fmt.Sprintf(`
CREATE TABLE IF NOT EXISTS %s (
    stream_id BYTEA PRIMARY KEY,
    genesis_miniblock_hash BYTEA NOT NULL,
    genesis_miniblock BYTEA NOT NULL,
    last_miniblock_hash BYTEA NOT NULL,
    last_miniblock_num BIGINT NOT NULL,
    flags BIGINT NOT NULL,
    replication_factor INT NOT NULL,
    sealed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at_height BIGINT NOT NULL,
    updated_at_height BIGINT NOT NULL,
    CHECK (octet_length(stream_id) = 32),
    CHECK (octet_length(genesis_miniblock_hash) = 32),
    CHECK (octet_length(last_miniblock_hash) = 32)
);`, s.streamsTable)

	nodesSQL := fmt.Sprintf(`
CREATE TABLE IF NOT EXISTS %s (
    stream_id BYTEA NOT NULL,
    node_addr BYTEA NOT NULL,
    PRIMARY KEY (stream_id, node_addr),
    CHECK (octet_length(node_addr) = 20),
    FOREIGN KEY (stream_id) REFERENCES %s(stream_id) ON DELETE CASCADE
);`, s.nodesTable, s.streamsTable)

	nodesIdxSQL := fmt.Sprintf(`CREATE INDEX IF NOT EXISTS %s_node_idx ON %s (node_addr);`, s.nodesTable, s.nodesTable)

	stateSQL := fmt.Sprintf(`
CREATE TABLE IF NOT EXISTS %s (
    single_row_key BOOL PRIMARY KEY DEFAULT TRUE,
    last_height BIGINT NOT NULL DEFAULT 0,
    last_app_hash BYTEA NOT NULL DEFAULT ''::BYTEA
);`, s.stateTable)

	stateSeedSQL := fmt.Sprintf(
		`INSERT INTO %s (single_row_key, last_height, last_app_hash) VALUES (TRUE, 0, ''::BYTEA) ON CONFLICT DO NOTHING;`,
		s.stateTable,
	)

	txLogSQL := fmt.Sprintf(`
CREATE TABLE IF NOT EXISTS %s (
    height BIGINT NOT NULL,
    tx_index INT NOT NULL,
    tx BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (height, tx_index)
);`, s.txLogTable)

	statements := []string{streamsSQL, nodesSQL, nodesIdxSQL, stateSQL, stateSeedSQL, txLogSQL}
	for _, sql := range statements {
		if _, err := tx.Exec(ctx, sql); err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
				Message("failed to ensure metadata shard tables").
				Tag("shardId", s.shardID)
		}
	}

	log.Debugw("metadata shard storage ensured", "shardId", s.shardID)
	return nil
}

func validateStreamID(streamID []byte) error {
	if len(streamID) != 32 {
		return RiverError(Err_INVALID_ARGUMENT, "stream_id must be 32 bytes")
	}
	return nil
}

func validateHash(hash []byte, field string) error {
	if len(hash) != 32 {
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("%s must be 32 bytes", field))
	}
	return nil
}

func normalizeNodeAddrs(nodes [][]byte) ([][]byte, error) {
	if len(nodes) == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "nodes must not be empty")
	}

	seen := make(map[string]struct{}, len(nodes))
	norm := make([][]byte, 0, len(nodes))
	for _, n := range nodes {
		if len(n) != 20 {
			return nil, RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes")
		}
		key := string(n)
		if _, exists := seen[key]; exists {
			continue
		}
		cp := make([]byte, len(n))
		copy(cp, n)
		norm = append(norm, cp)
		seen[key] = struct{}{}
	}

	slices.SortFunc(norm, func(a, b []byte) int {
		return bytes.Compare(a, b)
	})
	return norm, nil
}

func (s *PostgresMetadataShardStore) CreateStream(
	ctx context.Context,
	height int64,
	txData *protocol.CreateStreamTx,
) (*protocol.StreamMetadata, error) {
	if txData == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "create stream payload is required")
	}
	if err := validateStreamID(txData.StreamId); err != nil {
		return nil, err
	}
	if err := validateHash(txData.GenesisMiniblockHash, "genesis_miniblock_hash"); err != nil {
		return nil, err
	}
	nodes, err := normalizeNodeAddrs(txData.Nodes)
	if err != nil {
		return nil, err
	}
	if txData.ReplicationFactor == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor must be greater than zero")
	}

	record := &protocol.StreamMetadata{
		StreamId:             txData.StreamId,
		ShardId:              s.shardID,
		GenesisMiniblockHash: txData.GenesisMiniblockHash,
		LastMiniblockHash:    txData.GenesisMiniblockHash,
		LastMiniblockNum:     0,
		Nodes:                nodes,
		Flags:                txData.Flags,
		ReplicationFactor:    txData.ReplicationFactor,
		Sealed:               txData.Sealed,
		CreatedAtHeight:      height,
		UpdatedAtHeight:      height,
	}
	return record, s.txRunner(
		ctx,
		"MetadataShard.CreateStream",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createStreamTx(ctx, tx, record, txData.GenesisMiniblock)
		},
		nil,
		"shardId", s.shardID,
		"streamId", txData.StreamId,
	)
}

func (s *PostgresMetadataShardStore) createStreamTx(
	ctx context.Context,
	tx pgx.Tx,
	record *protocol.StreamMetadata,
	genesisMiniblock []byte,
) error {
	var exists bool
	err := tx.QueryRow(
		ctx,
		fmt.Sprintf("SELECT EXISTS (SELECT 1 FROM %s WHERE stream_id = $1)", s.streamsTable),
		record.StreamId,
	).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return RiverError(Err_ALREADY_EXISTS, "stream already exists", "streamId", record.StreamId)
	}

	insertStreamSQL := fmt.Sprintf(`
INSERT INTO %s
    (stream_id, genesis_miniblock_hash, genesis_miniblock, last_miniblock_hash, last_miniblock_num, flags, replication_factor, sealed, created_at_height, updated_at_height)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9);`, s.streamsTable)

	if _, err := tx.Exec(
		ctx,
		insertStreamSQL,
		record.StreamId,
		record.GenesisMiniblockHash,
		genesisMiniblock,
		record.LastMiniblockHash,
		record.LastMiniblockNum,
		record.Flags,
		record.ReplicationFactor,
		record.Sealed,
		record.CreatedAtHeight,
	); err != nil {
		return err
	}

	if err := s.replaceStreamNodesTx(ctx, tx, record.StreamId, record.Nodes); err != nil {
		return err
	}

	return nil
}

func (s *PostgresMetadataShardStore) ApplyMiniblockBatch(
	ctx context.Context,
	height int64,
	updates []*protocol.MiniblockUpdate,
) error {
	if len(updates) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "no miniblock updates provided")
	}
	for idx, u := range updates {
		if u == nil {
			return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("update at index %d missing", idx))
		}
		if err := validateStreamID(u.StreamId); err != nil {
			return err
		}
		if err := validateHash(u.LastMiniblockHash, "last_miniblock_hash"); err != nil {
			return err
		}
		if err := validateHash(u.PrevMiniblockHash, "prev_miniblock_hash"); err != nil {
			return err
		}
	}

	return s.txRunner(
		ctx,
		"MetadataShard.ApplyMiniblockBatch",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			for _, update := range updates {
				if err := s.applyMiniblockUpdateTx(ctx, tx, height, update); err != nil {
					return err
				}
			}
			return nil
		},
		nil,
		"shardId", s.shardID,
		"numUpdates", len(updates),
	)
}

func (s *PostgresMetadataShardStore) applyMiniblockUpdateTx(
	ctx context.Context,
	tx pgx.Tx,
	height int64,
	update *protocol.MiniblockUpdate,
) error {
	var (
		currentHash []byte
		currentNum  int64
		currentSeal bool
	)

	selectSQL := fmt.Sprintf(
		`SELECT last_miniblock_hash, last_miniblock_num, sealed FROM %s WHERE stream_id = $1 FOR UPDATE`,
		s.streamsTable,
	)
	if err := tx.QueryRow(ctx, selectSQL, update.StreamId).Scan(&currentHash, &currentNum, &currentSeal); err != nil {
		if err == pgx.ErrNoRows {
			return RiverError(Err_NOT_FOUND, "stream not found", "streamId", update.StreamId)
		}
		return err
	}

	if !bytes.Equal(currentHash, update.PrevMiniblockHash) {
		return RiverError(
			Err_FAILED_PRECONDITION,
			"prev_miniblock_hash mismatch",
			"streamId", update.StreamId,
		)
	}

	if update.LastMiniblockNum <= currentNum {
		return RiverError(
			Err_FAILED_PRECONDITION,
			"last_miniblock_num is not increasing",
			"streamId", update.StreamId,
			"current", currentNum,
			"proposed", update.LastMiniblockNum,
		)
	}

	updateSQL := fmt.Sprintf(
		`UPDATE %s
SET last_miniblock_hash = $2,
    last_miniblock_num = $3,
    sealed = $4,
    updated_at_height = $5
WHERE stream_id = $1`,
		s.streamsTable,
	)
	_, err := tx.Exec(
		ctx,
		updateSQL,
		update.StreamId,
		update.LastMiniblockHash,
		update.LastMiniblockNum,
		currentSeal || update.Sealed,
		height,
	)
	return err
}

func (s *PostgresMetadataShardStore) UpdateStreamNodesAndReplication(
	ctx context.Context,
	height int64,
	update *protocol.UpdateStreamNodesAndReplicationTx,
) (*protocol.StreamMetadata, error) {
	if update == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "update payload is required")
	}
	if err := validateStreamID(update.StreamId); err != nil {
		return nil, err
	}
	nodes, err := normalizeNodeAddrs(update.Nodes)
	if err != nil {
		return nil, err
	}

	var result *protocol.StreamMetadata
	err = s.txRunner(
		ctx,
		"MetadataShard.UpdateStreamNodesAndReplication",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			record, innerErr := s.updateStreamNodesAndReplicationTx(ctx, tx, height, update, nodes)
			if innerErr != nil {
				return innerErr
			}
			result = record
			return nil
		},
		nil,
		"shardId", s.shardID,
		"streamId", update.StreamId,
	)
	return result, err
}

func (s *PostgresMetadataShardStore) updateStreamNodesAndReplicationTx(
	ctx context.Context,
	tx pgx.Tx,
	height int64,
	update *protocol.UpdateStreamNodesAndReplicationTx,
	nodes [][]byte,
) (*protocol.StreamMetadata, error) {
	var (
		replicationFactor uint32
		flags             uint64
		sealed            bool
		lastHash          []byte
		lastNum           int64
		createdHeight     int64
		existingNodes     [][]byte
		genesisHash       []byte
	)

	selectSQL := fmt.Sprintf(
		`SELECT replication_factor, flags, sealed, last_miniblock_hash, last_miniblock_num, created_at_height, genesis_miniblock_hash FROM %s WHERE stream_id = $1 FOR UPDATE`,
		s.streamsTable,
	)
	if err := tx.QueryRow(
		ctx,
		selectSQL,
		update.StreamId,
	).Scan(&replicationFactor, &flags, &sealed, &lastHash, &lastNum, &createdHeight, &genesisHash); err != nil {
		if err == pgx.ErrNoRows {
			return nil, RiverError(Err_NOT_FOUND, "stream not found", "streamId", update.StreamId)
		}
		return nil, err
	}

	existingNodes, err := s.getStreamNodesTx(ctx, tx, update.StreamId)
	if err != nil {
		return nil, err
	}

	if sealed && len(nodes) > 0 && !bytes.Equal(flattenNodes(existingNodes), flattenNodes(nodes)) {
		return nil, RiverError(Err_FAILED_PRECONDITION, "sealed stream nodes cannot be changed", "streamId", update.StreamId)
	}

	if update.ReplicationFactor != nil {
		replicationFactor = *update.ReplicationFactor
	}

	if replicationFactor == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor must be greater than zero")
	}

	updateSQL := fmt.Sprintf(
		`UPDATE %s
SET replication_factor = $2,
    updated_at_height = $3
WHERE stream_id = $1`,
		s.streamsTable,
	)
	if _, err := tx.Exec(ctx, updateSQL, update.StreamId, replicationFactor, height); err != nil {
		return nil, err
	}

	if err := s.replaceStreamNodesTx(ctx, tx, update.StreamId, nodes); err != nil {
		return nil, err
	}

	return &protocol.StreamMetadata{
		StreamId:             update.StreamId,
		ShardId:              s.shardID,
		GenesisMiniblockHash: genesisHash,
		LastMiniblockHash:    lastHash,
		LastMiniblockNum:     lastNum,
		Nodes:                nodes,
		Flags:                flags,
		ReplicationFactor:    replicationFactor,
		Sealed:               sealed,
		CreatedAtHeight:      createdHeight,
		UpdatedAtHeight:      height,
	}, nil
}

func flattenNodes(nodes [][]byte) []byte {
	var out []byte
	for _, n := range nodes {
		out = append(out, n...)
	}
	return out
}

func (s *PostgresMetadataShardStore) replaceStreamNodesTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID []byte,
	nodes [][]byte,
) error {
	if _, err := tx.Exec(ctx, fmt.Sprintf(`DELETE FROM %s WHERE stream_id = $1`, s.nodesTable), streamID); err != nil {
		return err
	}

	insertSQL := fmt.Sprintf(`INSERT INTO %s (stream_id, node_addr) VALUES ($1, $2)`, s.nodesTable)
	for _, node := range nodes {
		if _, err := tx.Exec(ctx, insertSQL, streamID, node); err != nil {
			return err
		}
	}
	return nil
}

func (s *PostgresMetadataShardStore) getStreamNodesTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID []byte,
) ([][]byte, error) {
	rows, err := tx.Query(
		ctx,
		fmt.Sprintf(`SELECT node_addr FROM %s WHERE stream_id = $1 ORDER BY node_addr`, s.nodesTable),
		streamID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes [][]byte
	for rows.Next() {
		var addr []byte
		if err := rows.Scan(&addr); err != nil {
			return nil, err
		}
		nodes = append(nodes, addr)
	}
	return nodes, rows.Err()
}

func (s *PostgresMetadataShardStore) GetStream(
	ctx context.Context,
	streamID []byte,
) (*protocol.StreamMetadata, error) {
	if err := validateStreamID(streamID); err != nil {
		return nil, err
	}

	var record *protocol.StreamMetadata
	err := s.txRunner(
		ctx,
		"MetadataShard.GetStream",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			r, innerErr := s.getStreamTx(ctx, tx, streamID)
			if innerErr != nil {
				return innerErr
			}
			record = r
			return nil
		},
		&txRunnerOpts{skipLoggingNotFound: true},
		"shardId", s.shardID,
		"streamId", streamID,
	)
	return record, err
}

func (s *PostgresMetadataShardStore) getStreamTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID []byte,
) (*protocol.StreamMetadata, error) {
	var (
		genesisHash []byte
		lastHash    []byte
		lastNum     int64
		flags       uint64
		repFactor   uint32
		sealed      bool
		created     int64
		updated     int64
		nodesArray  pgtype.ByteaArray
	)

	query := fmt.Sprintf(
		`SELECT s.genesis_miniblock_hash,
                s.last_miniblock_hash,
                s.last_miniblock_num,
                s.flags,
                s.replication_factor,
                s.sealed,
                s.created_at_height,
                s.updated_at_height,
                COALESCE(n.nodes, '{}') AS nodes
         FROM %s s
         LEFT JOIN LATERAL (
             SELECT array_agg(node_addr ORDER BY node_addr) AS nodes
             FROM %s n WHERE n.stream_id = s.stream_id
         ) n ON TRUE
         WHERE s.stream_id = $1`,
		s.streamsTable,
		s.nodesTable,
	)

	if err := tx.QueryRow(ctx, query, streamID).Scan(
		&genesisHash,
		&lastHash,
		&lastNum,
		&flags,
		&repFactor,
		&sealed,
		&created,
		&updated,
		&nodesArray,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, RiverError(Err_NOT_FOUND, "stream not found", "streamId", streamID)
		}
		return nil, err
	}

	return &protocol.StreamMetadata{
		StreamId:             streamID,
		ShardId:              s.shardID,
		GenesisMiniblockHash: genesisHash,
		LastMiniblockHash:    lastHash,
		LastMiniblockNum:     lastNum,
		Nodes:                byteaArrayToSlice(nodesArray),
		Flags:                flags,
		ReplicationFactor:    repFactor,
		Sealed:               sealed,
		CreatedAtHeight:      created,
		UpdatedAtHeight:      updated,
	}, nil
}

func (s *PostgresMetadataShardStore) ListStreams(
	ctx context.Context,
	offset int64,
	limit int32,
) ([]*protocol.StreamMetadata, error) {
	var records []*protocol.StreamMetadata
	err := s.txRunner(
		ctx,
		"MetadataShard.ListStreams",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			rows, err := tx.Query(
				ctx,
				fmt.Sprintf(
					`SELECT s.stream_id,
                            s.genesis_miniblock_hash,
                            s.last_miniblock_hash,
                            s.last_miniblock_num,
                            s.flags,
                            s.replication_factor,
                            s.sealed,
                            s.created_at_height,
                            s.updated_at_height,
                            COALESCE(n.nodes, '{}') AS nodes
                     FROM %s s
                     LEFT JOIN LATERAL (
                         SELECT array_agg(node_addr ORDER BY node_addr) AS nodes
                         FROM %s n WHERE n.stream_id = s.stream_id
                     ) n ON TRUE
                     ORDER BY s.stream_id
                     OFFSET $1 LIMIT $2`,
					s.streamsTable,
					s.nodesTable,
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
					streamID    []byte
					genesisHash []byte
					lastHash    []byte
					lastNum     int64
					flags       uint64
					repFactor   uint32
					sealed      bool
					created     int64
					updated     int64
					nodesArray  pgtype.ByteaArray
				)
				if err := rows.Scan(
					&streamID,
					&genesisHash,
					&lastHash,
					&lastNum,
					&flags,
					&repFactor,
					&sealed,
					&created,
					&updated,
					&nodesArray,
				); err != nil {
					return err
				}

				records = append(records, &protocol.StreamMetadata{
					StreamId:             streamID,
					ShardId:              s.shardID,
					GenesisMiniblockHash: genesisHash,
					LastMiniblockHash:    lastHash,
					LastMiniblockNum:     lastNum,
					Nodes:                byteaArrayToSlice(nodesArray),
					Flags:                flags,
					ReplicationFactor:    repFactor,
					Sealed:               sealed,
					CreatedAtHeight:      created,
					UpdatedAtHeight:      updated,
				})
			}
			return rows.Err()
		},
		nil,
		"shardId", s.shardID,
	)
	return records, err
}

func (s *PostgresMetadataShardStore) ListStreamsByNode(
	ctx context.Context,
	node []byte,
	offset int64,
	limit int32,
) ([]*protocol.StreamMetadata, error) {
	if len(node) != 20 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "node must be 20 bytes")
	}

	var records []*protocol.StreamMetadata
	err := s.txRunner(
		ctx,
		"MetadataShard.ListStreamsByNode",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			rows, err := tx.Query(
				ctx,
				fmt.Sprintf(
					`SELECT s.stream_id,
                            s.genesis_miniblock_hash,
                            s.last_miniblock_hash,
                            s.last_miniblock_num,
                            s.flags,
                            s.replication_factor,
                            s.sealed,
                            s.created_at_height,
                            s.updated_at_height,
                            COALESCE(n.nodes, '{}') AS nodes
                     FROM %s s
                     JOIN %s sn ON sn.stream_id = s.stream_id AND sn.node_addr = $1
                     LEFT JOIN LATERAL (
                         SELECT array_agg(node_addr ORDER BY node_addr) AS nodes
                         FROM %s n WHERE n.stream_id = s.stream_id
                     ) n ON TRUE
                     ORDER BY s.stream_id
                     OFFSET $2 LIMIT $3`,
					s.streamsTable,
					s.nodesTable,
					s.nodesTable,
				),
				node,
				offset,
				limit,
			)
			if err != nil {
				return err
			}
			defer rows.Close()

			for rows.Next() {
				var (
					streamID    []byte
					genesisHash []byte
					lastHash    []byte
					lastNum     int64
					flags       uint64
					repFactor   uint32
					sealed      bool
					created     int64
					updated     int64
					nodesArray  pgtype.ByteaArray
				)
				if err := rows.Scan(
					&streamID,
					&genesisHash,
					&lastHash,
					&lastNum,
					&flags,
					&repFactor,
					&sealed,
					&created,
					&updated,
					&nodesArray,
				); err != nil {
					return err
				}

				records = append(records, &protocol.StreamMetadata{
					StreamId:             streamID,
					ShardId:              s.shardID,
					GenesisMiniblockHash: genesisHash,
					LastMiniblockHash:    lastHash,
					LastMiniblockNum:     lastNum,
					Nodes:                byteaArrayToSlice(nodesArray),
					Flags:                flags,
					ReplicationFactor:    repFactor,
					Sealed:               sealed,
					CreatedAtHeight:      created,
					UpdatedAtHeight:      updated,
				})
			}
			return rows.Err()
		},
		nil,
		"shardId", s.shardID,
		"node", node,
	)
	return records, err
}

func (s *PostgresMetadataShardStore) CountStreams(ctx context.Context) (int64, error) {
	var count int64
	err := s.txRunner(
		ctx,
		"MetadataShard.CountStreams",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM %s`, s.streamsTable)).Scan(&count)
		},
		nil,
		"shardId", s.shardID,
	)
	return count, err
}

func (s *PostgresMetadataShardStore) CountStreamsByNode(ctx context.Context, node []byte) (int64, error) {
	if len(node) != 20 {
		return 0, RiverError(Err_INVALID_ARGUMENT, "node must be 20 bytes")
	}

	var count int64
	err := s.txRunner(
		ctx,
		"MetadataShard.CountStreamsByNode",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(
				ctx,
				fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE node_addr = $1`, s.nodesTable),
				node,
			).Scan(&count)
		},
		nil,
		"shardId", s.shardID,
		"node", node,
	)
	return count, err
}

func (s *PostgresMetadataShardStore) SetShardState(ctx context.Context, height int64, appHash []byte) error {
	if appHash == nil {
		appHash = []byte{}
	}
	return s.txRunner(
		ctx,
		"MetadataShard.SetShardState",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			updateSQL := fmt.Sprintf(
				`UPDATE %s SET last_height = $1, last_app_hash = $2 WHERE single_row_key = TRUE`,
				s.stateTable,
			)
			if _, err := tx.Exec(ctx, updateSQL, height, appHash); err != nil {
				return err
			}
			return nil
		},
		nil,
		"shardId", s.shardID,
		"height", height,
	)
}

func (s *PostgresMetadataShardStore) GetShardState(ctx context.Context) (*MetadataShardState, error) {
	state := &MetadataShardState{}
	err := s.txRunner(
		ctx,
		"MetadataShard.GetShardState",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			query := fmt.Sprintf(`SELECT last_height, last_app_hash FROM %s WHERE single_row_key = TRUE`, s.stateTable)
			return tx.QueryRow(ctx, query).Scan(&state.LastHeight, &state.LastAppHash)
		},
		nil,
		"shardId", s.shardID,
	)
	return state, err
}

func (s *PostgresMetadataShardStore) GetStreamsStateSnapshot(
	ctx context.Context,
) ([]*protocol.StreamMetadata, error) {
	var records []*protocol.StreamMetadata
	err := s.txRunner(
		ctx,
		"MetadataShard.GetStreamsStateSnapshot",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			rows, err := tx.Query(
				ctx,
				fmt.Sprintf(
					`SELECT s.stream_id,
                            s.genesis_miniblock_hash,
                            s.last_miniblock_hash,
                            s.last_miniblock_num,
                            s.flags,
                            s.replication_factor,
                            s.sealed,
                            s.created_at_height,
                            s.updated_at_height,
                            COALESCE(n.nodes, '{}') AS nodes
                     FROM %s s
                     LEFT JOIN LATERAL (
                         SELECT array_agg(node_addr ORDER BY node_addr) AS nodes
                         FROM %s n WHERE n.stream_id = s.stream_id
                     ) n ON TRUE
                     ORDER BY s.stream_id`,
					s.streamsTable,
					s.nodesTable,
				),
			)
			if err != nil {
				return err
			}
			defer rows.Close()

			for rows.Next() {
				var (
					streamID    []byte
					genesisHash []byte
					lastHash    []byte
					lastNum     int64
					flags       uint64
					repFactor   uint32
					sealed      bool
					created     int64
					updated     int64
					nodesArray  pgtype.ByteaArray
				)
				if err := rows.Scan(
					&streamID,
					&genesisHash,
					&lastHash,
					&lastNum,
					&flags,
					&repFactor,
					&sealed,
					&created,
					&updated,
					&nodesArray,
				); err != nil {
					return err
				}

				records = append(records, &protocol.StreamMetadata{
					StreamId:             streamID,
					ShardId:              s.shardID,
					GenesisMiniblockHash: genesisHash,
					LastMiniblockHash:    lastHash,
					LastMiniblockNum:     lastNum,
					Nodes:                byteaArrayToSlice(nodesArray),
					Flags:                flags,
					ReplicationFactor:    repFactor,
					Sealed:               sealed,
					CreatedAtHeight:      created,
					UpdatedAtHeight:      updated,
				})
			}

			return rows.Err()
		},
		nil,
		"shardId", s.shardID,
	)
	return records, err
}

func byteaArrayToSlice(arr pgtype.ByteaArray) [][]byte {
	nodes := make([][]byte, 0, len(arr.Elements))
	for _, el := range arr.Elements {
		if el.Status == pgtype.Present {
			cp := make([]byte, len(el.Bytes))
			copy(cp, el.Bytes)
			nodes = append(nodes, cp)
		}
	}
	return nodes
}
