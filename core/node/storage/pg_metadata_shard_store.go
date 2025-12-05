package storage

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"math"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// MetadataShardState captures persisted shard info used by ABCI commit.
type MetadataShardState struct {
	LastHeight  int64
	LastAppHash []byte
}

type PostgresMetadataShardStore struct {
	store *PostgresEventStore
}

type MetadataStore interface {
	EnsureShardStorage(ctx context.Context, shardId uint64) error
	CreateStream(ctx context.Context, shardId uint64, height int64, tx *CreateStreamTx) (*StreamMetadata, error)
	ApplyMiniblockBatch(ctx context.Context, shardId uint64, height int64, updates []*MiniblockUpdate) error
	UpdateStreamNodesAndReplication(
		ctx context.Context,
		shardId uint64,
		height int64,
		update *UpdateStreamNodesAndReplicationTx,
	) (*StreamMetadata, error)
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
	SetShardState(ctx context.Context, shardId uint64, height int64, appHash []byte) error
	GetShardState(ctx context.Context, shardId uint64) (*MetadataShardState, error)
	GetStreamsStateSnapshot(ctx context.Context, shardId uint64) ([]*StreamMetadata, error)
	ApplyMetadataTx(ctx context.Context, shardId uint64, height int64, tx *MetadataTx) error
	ComputeAppHash(ctx context.Context, shardId uint64) ([]byte, error)
}

var _ MetadataStore = (*PostgresMetadataShardStore)(nil)

// NewPostgresMetadataShardStore instantiates a new metadata shard store for the given shard ID,
// sharing the provided PostgresEventStore (typically from PostgresStreamStore) and schema.
func NewPostgresMetadataShardStore(
	ctx context.Context,
	eventStore *PostgresEventStore,
	shardId uint64,
) (*PostgresMetadataShardStore, error) {
	if eventStore == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "eventStore is required")
	}

	store := &PostgresMetadataShardStore{
		store: eventStore,
	}

	if err := store.EnsureShardStorage(ctx, shardId); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresMetadataShardStore")
	}

	return store, nil
}

// Close is a no-op to avoid shutting down the shared PostgresEventStore.
func (*PostgresMetadataShardStore) Close(context.Context) {}

// sqlForShard replaces placeholders with shard-specific table names.
// Supported placeholders: {{streams}}, {{nodes}}.
func (s *PostgresMetadataShardStore) sqlForShard(template string, shardId uint64) string {
	streams := fmt.Sprintf("md_%04x_s", shardId)
	nodes := fmt.Sprintf("md_%04x_n", shardId)

	replacer := strings.NewReplacer(
		"{{streams}}", streams,
		"{{nodes}}", nodes,
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
	log := logging.FromCtx(ctx)
	streamsSQL := s.sqlForShard(`
CREATE TABLE IF NOT EXISTS {{streams}} (
    stream_id BYTEA PRIMARY KEY,
    genesis_miniblock_hash BYTEA NOT NULL,
    genesis_miniblock BYTEA NOT NULL,
    last_miniblock_hash BYTEA NOT NULL,
    last_miniblock_num BIGINT NOT NULL,
    replication_factor INT NOT NULL,
    sealed BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (octet_length(stream_id) = 32),
    CHECK (octet_length(genesis_miniblock_hash) = 32),
    CHECK (octet_length(last_miniblock_hash) = 32),
    CHECK (last_miniblock_num >= 0),
    CHECK (replication_factor > 0)
);`, shardId)

	nodesSQL := s.sqlForShard(`
CREATE TABLE IF NOT EXISTS {{nodes}} (
    stream_id BYTEA NOT NULL,
    position INT NOT NULL,
    node_addr BYTEA NOT NULL,
    PRIMARY KEY (stream_id, position),
    UNIQUE (stream_id, node_addr),
    CHECK (octet_length(node_addr) = 20),
    FOREIGN KEY (stream_id) REFERENCES {{streams}}(stream_id) ON DELETE CASCADE
);`, shardId)

	nodesIdxSQL := s.sqlForShard(`CREATE INDEX IF NOT EXISTS {{nodes}}_node_idx ON {{nodes}} (node_addr);`, shardId)

	stateSQL := s.sqlForShard(`
CREATE TABLE IF NOT EXISTS metadata (
    shard_id BIGINT PRIMARY KEY,
    last_height BIGINT NOT NULL DEFAULT 0,
    last_app_hash BYTEA NOT NULL DEFAULT ''::BYTEA
);`, shardId)

	stateSeedSQL := `INSERT INTO metadata (shard_id, last_height, last_app_hash) VALUES ($1, 0, ''::BYTEA) ON CONFLICT DO NOTHING;`

	statements := []string{streamsSQL, nodesSQL, nodesIdxSQL, stateSQL}
	for _, sql := range statements {
		if _, err := tx.Exec(ctx, sql); err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
				Message("failed to ensure metadata shard tables").
				Tag("shardId", shardId)
		}
	}

	if _, err := tx.Exec(ctx, stateSeedSQL, int64(shardId)); err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
			Message("failed to seed metadata shard state").
			Tag("shardId", shardId)
	}

	log.Debugw("metadata shard storage ensured", "shardId", shardId)
	return nil
}

func validateStreamID(streamId []byte) error {
	if len(streamId) != 32 {
		return RiverError(Err_INVALID_ARGUMENT, "stream_id must be 32 bytes")
	}
	return nil
}

func validateHash(hash []byte, field string) error {
	if len(hash) != 32 {
		return RiverError(
			Err_INVALID_ARGUMENT,
			"hash length invalid",
			"field",
			field,
			"expectedLen",
			32,
			"actualLen",
			len(hash),
		)
	}
	return nil
}

func validateNodeAddrs(nodes [][]byte, allowEmpty bool) ([][]byte, error) {
	if len(nodes) == 0 {
		if allowEmpty {
			return nil, nil
		}
		return nil, RiverError(Err_INVALID_ARGUMENT, "nodes must not be empty")
	}

	for _, n := range nodes {
		if len(n) != 20 {
			return nil, RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes")
		}
	}
	return nodes, nil
}

func (s *PostgresMetadataShardStore) CreateStream(
	ctx context.Context,
	shardID uint64,
	height int64,
	txData *CreateStreamTx,
) (*StreamMetadata, error) {
	_ = height

	if txData == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "create stream payload is required")
	}
	if err := validateStreamID(txData.StreamId); err != nil {
		return nil, err
	}
	if err := validateHash(txData.GenesisMiniblockHash, "genesis_miniblock_hash"); err != nil {
		return nil, err
	}
	nodes, err := validateNodeAddrs(txData.Nodes, false)
	if err != nil {
		return nil, err
	}
	if txData.ReplicationFactor == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor must be greater than zero")
	}
	if int(txData.ReplicationFactor) > len(nodes) {
		return nil, RiverError(
			Err_INVALID_ARGUMENT,
			"replication_factor cannot exceed number of nodes",
			"replicationFactor", txData.ReplicationFactor,
			"numNodes", len(nodes),
		)
	}
	if txData.LastMiniblockNum > math.MaxInt64 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "last_miniblock_num too large")
	}

	var (
		lastMiniblockHash []byte
		lastMiniblockNum  = int64(txData.LastMiniblockNum)
	)

	genesisMiniblock := txData.GenesisMiniblock
	if genesisMiniblock == nil {
		genesisMiniblock = []byte{}
	}

	if txData.LastMiniblockNum == 0 {
		if len(txData.GenesisMiniblock) == 0 {
			return nil, RiverError(Err_INVALID_ARGUMENT, "genesis_miniblock required when last_miniblock_num is 0")
		}
		if len(txData.LastMiniblockHash) > 0 && !bytes.Equal(txData.LastMiniblockHash, txData.GenesisMiniblockHash) {
			return nil, RiverError(
				Err_INVALID_ARGUMENT,
				"last_miniblock_hash must match genesis_miniblock_hash when last_miniblock_num is 0",
			)
		}
		lastMiniblockHash = txData.GenesisMiniblockHash
	} else {
		if err := validateHash(txData.LastMiniblockHash, "last_miniblock_hash"); err != nil {
			return nil, err
		}
		lastMiniblockHash = txData.LastMiniblockHash
	}

	record := &StreamMetadata{
		StreamId:             txData.StreamId,
		GenesisMiniblockHash: txData.GenesisMiniblockHash,
		LastMiniblockHash:    lastMiniblockHash,
		LastMiniblockNum:     lastMiniblockNum,
		Nodes:                nodes,
		ReplicationFactor:    txData.ReplicationFactor,
		Sealed:               txData.Sealed,
		GenesisMiniblock:     genesisMiniblock,
	}
	return record, s.store.txRunner(
		ctx,
		"MetadataShard.CreateStream",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createStreamTx(ctx, tx, shardID, record, genesisMiniblock)
		},
		nil,
		"shardId", shardID,
		"streamId", txData.StreamId,
	)
}

func (s *PostgresMetadataShardStore) createStreamTx(
	ctx context.Context,
	tx pgx.Tx,
	shardID uint64,
	record *StreamMetadata,
	genesisMiniblock []byte,
) error {
	var exists bool
	err := tx.QueryRow(ctx, s.sqlForShard(
		"SELECT EXISTS (SELECT 1 FROM {{streams}} WHERE stream_id = $1)", shardID),
		record.StreamId).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return RiverError(Err_ALREADY_EXISTS, "stream already exists", "streamId", record.StreamId)
	}

	insertStreamSQL := s.sqlForShard(`
INSERT INTO {{streams}}
    (stream_id, genesis_miniblock_hash, genesis_miniblock, last_miniblock_hash, last_miniblock_num, replication_factor, sealed)
VALUES ($1,$2,$3,$4,$5,$6,$7);`, shardID)

	if _, err := tx.Exec(
		ctx,
		insertStreamSQL,
		record.StreamId,
		record.GenesisMiniblockHash,
		genesisMiniblock,
		record.LastMiniblockHash,
		record.LastMiniblockNum,
		record.ReplicationFactor,
		record.Sealed,
	); err != nil {
		return err
	}

	if err := s.replaceStreamNodesTx(ctx, tx, shardID, record.StreamId, record.Nodes); err != nil {
		return err
	}

	return nil
}

func (s *PostgresMetadataShardStore) ApplyMiniblockBatch(
	ctx context.Context,
	shardID uint64,
	height int64,
	updates []*MiniblockUpdate,
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
		if u.LastMiniblockNum == 0 {
			return RiverError(Err_INVALID_ARGUMENT, "last_miniblock_num must be greater than 0")
		}
	}

	return s.store.txRunner(
		ctx,
		"MetadataShard.ApplyMiniblockBatch",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			for _, update := range updates {
				if err := s.applyMiniblockUpdateTx(ctx, tx, shardID, height, update); err != nil {
					return err
				}
			}
			return nil
		},
		nil,
		"shardId", shardID,
		"numUpdates", len(updates),
	)
}

func (s *PostgresMetadataShardStore) applyMiniblockUpdateTx(
	ctx context.Context,
	tx pgx.Tx,
	shardID uint64,
	height int64,
	update *MiniblockUpdate,
) error {
	_ = height

	var (
		currentHash []byte
		currentNum  int64
		currentSeal bool
	)

	selectSQL := s.sqlForShard(
		`SELECT last_miniblock_hash, last_miniblock_num, sealed FROM {{streams}} WHERE stream_id = $1 FOR UPDATE`,
		shardID,
	)
	if err := tx.QueryRow(ctx, selectSQL, update.StreamId).Scan(&currentHash, &currentNum, &currentSeal); err != nil {
		if err == pgx.ErrNoRows {
			return RiverError(Err_NOT_FOUND, "stream not found", "streamId", update.StreamId)
		}
		return err
	}

	if currentSeal {
		return RiverError(Err_FAILED_PRECONDITION, "stream is sealed", "streamId", update.StreamId)
	}

	if !bytes.Equal(currentHash, update.PrevMiniblockHash) {
		return RiverError(
			Err_FAILED_PRECONDITION,
			"prev_miniblock_hash mismatch",
			"streamId", update.StreamId,
		)
	}

	if update.LastMiniblockNum > math.MaxInt64 {
		return RiverError(Err_INVALID_ARGUMENT, "last_miniblock_num too large")
	}

	nextNum := int64(update.LastMiniblockNum)
	if nextNum != currentNum+1 {
		return RiverError(
			Err_FAILED_PRECONDITION,
			"last_miniblock_num must increase by 1",
			"streamId", update.StreamId,
			"current", currentNum,
			"proposed", nextNum,
		)
	}

	updateSQL := s.sqlForShard(
		`UPDATE {{streams}}
SET last_miniblock_hash = $2,
    last_miniblock_num = $3,
    sealed = $4
WHERE stream_id = $1`,
		shardID,
	)
	_, err := tx.Exec(
		ctx,
		updateSQL,
		update.StreamId,
		update.LastMiniblockHash,
		nextNum,
		currentSeal || update.Sealed,
	)
	return err
}

func (s *PostgresMetadataShardStore) UpdateStreamNodesAndReplication(
	ctx context.Context,
	shardID uint64,
	height int64,
	update *UpdateStreamNodesAndReplicationTx,
) (*StreamMetadata, error) {
	if update == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "update payload is required")
	}
	if err := validateStreamID(update.StreamId); err != nil {
		return nil, err
	}
	nodes, err := validateNodeAddrs(update.Nodes, true)
	if err != nil {
		return nil, err
	}

	var result *StreamMetadata
	err = s.store.txRunner(
		ctx,
		"MetadataShard.UpdateStreamNodesAndReplication",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			record, innerErr := s.updateStreamNodesAndReplicationTx(ctx, tx, shardID, height, update, nodes)
			if innerErr != nil {
				return innerErr
			}
			result = record
			return nil
		},
		nil,
		"shardId", shardID,
		"streamId", update.StreamId,
	)
	return result, err
}

func (s *PostgresMetadataShardStore) updateStreamNodesAndReplicationTx(
	ctx context.Context,
	tx pgx.Tx,
	shardID uint64,
	height int64,
	update *UpdateStreamNodesAndReplicationTx,
	nodes [][]byte,
) (*StreamMetadata, error) {
	_ = height

	var (
		replicationFactor uint32
		sealed            bool
		lastHash          []byte
		lastNum           int64
		existingNodes     [][]byte
		genesisHash       []byte
		genesisMiniblock  []byte
	)

	selectSQL := s.sqlForShard(
		`SELECT replication_factor, sealed, last_miniblock_hash, last_miniblock_num, genesis_miniblock_hash, genesis_miniblock FROM {{streams}} WHERE stream_id = $1 FOR UPDATE`,
		shardID,
	)
	if err := tx.QueryRow(
		ctx,
		selectSQL,
		update.StreamId,
	).Scan(&replicationFactor, &sealed, &lastHash, &lastNum, &genesisHash, &genesisMiniblock); err != nil {
		if err == pgx.ErrNoRows {
			return nil, RiverError(Err_NOT_FOUND, "stream not found", "streamId", update.StreamId)
		}
		return nil, err
	}

	existingNodes, err := s.getStreamNodesTx(ctx, tx, shardID, update.StreamId)
	if err != nil {
		return nil, err
	}

	targetNodes := existingNodes
	if len(nodes) > 0 {
		targetNodes = nodes
		if sealed && !bytes.Equal(flattenNodes(existingNodes), flattenNodes(nodes)) {
			return nil, RiverError(
				Err_FAILED_PRECONDITION,
				"sealed stream nodes cannot be changed",
				"streamId",
				update.StreamId,
			)
		}
	}

	newReplicationFactor := replicationFactor
	if update.ReplicationFactor != 0 {
		newReplicationFactor = update.ReplicationFactor
	}

	if newReplicationFactor == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor must be greater than zero")
	}
	if len(targetNodes) == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "nodes must not be empty")
	}
	if int(newReplicationFactor) > len(targetNodes) {
		return nil, RiverError(
			Err_INVALID_ARGUMENT,
			"replication_factor cannot exceed number of nodes",
			"replicationFactor", newReplicationFactor,
			"numNodes", len(targetNodes),
		)
	}

	updateSQL := s.sqlForShard(
		`UPDATE {{streams}}
SET replication_factor = $2
WHERE stream_id = $1`,
		shardID,
	)
	if _, err := tx.Exec(ctx, updateSQL, update.StreamId, newReplicationFactor); err != nil {
		return nil, err
	}

	if len(nodes) > 0 {
		if err := s.replaceStreamNodesTx(ctx, tx, shardID, update.StreamId, nodes); err != nil {
			return nil, err
		}
	}

	return &StreamMetadata{
		StreamId:             update.StreamId,
		GenesisMiniblockHash: genesisHash,
		LastMiniblockHash:    lastHash,
		LastMiniblockNum:     lastNum,
		Nodes:                targetNodes,
		ReplicationFactor:    newReplicationFactor,
		Sealed:               sealed,
		GenesisMiniblock:     genesisMiniblock,
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
	shardID uint64,
	streamId []byte,
	nodes [][]byte,
) error {
	deleteSQL := s.sqlForShard(`DELETE FROM {{nodes}} WHERE stream_id = $1`, shardID)
	if _, err := tx.Exec(ctx, deleteSQL, streamId); err != nil {
		return err
	}

	insertSQL := s.sqlForShard(`INSERT INTO {{nodes}} (stream_id, position, node_addr) VALUES ($1, $2, $3)`, shardID)
	for idx, node := range nodes {
		if _, err := tx.Exec(ctx, insertSQL, streamId, idx, node); err != nil {
			return err
		}
	}
	return nil
}

func (s *PostgresMetadataShardStore) getStreamNodesTx(
	ctx context.Context,
	tx pgx.Tx,
	shardID uint64,
	streamId []byte,
) ([][]byte, error) {
	rows, err := tx.Query(
		ctx,
		s.sqlForShard(`SELECT node_addr FROM {{nodes}} WHERE stream_id = $1 ORDER BY position`, shardID),
		streamId,
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
		genesisHash []byte
		genesisMB   []byte
		lastHash    []byte
		lastNum     int64
		repFactor   uint32
		sealed      bool
		nodesArray  pgtype.FlatArray[[]byte]
	)

	query := s.sqlForShard(
		`SELECT s.genesis_miniblock_hash,
                s.genesis_miniblock,
                s.last_miniblock_hash,
                s.last_miniblock_num,
                s.replication_factor,
                s.sealed,
                COALESCE(n.nodes, '{}') AS nodes
         FROM {{streams}} s
         LEFT JOIN LATERAL (
             SELECT array_agg(node_addr ORDER BY position) AS nodes
             FROM {{nodes}} n WHERE n.stream_id = s.stream_id
         ) n ON TRUE
         WHERE s.stream_id = $1`,
		shardID,
	)

	if err := tx.QueryRow(ctx, query, streamId[:]).Scan(
		&genesisHash,
		&genesisMB,
		&lastHash,
		&lastNum,
		&repFactor,
		&sealed,
		&nodesArray,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, RiverError(Err_NOT_FOUND, "stream not found", "streamId", streamId)
		}
		return nil, err
	}

	return &StreamMetadata{
		StreamId:             streamId[:],
		GenesisMiniblockHash: genesisHash,
		GenesisMiniblock:     genesisMB,
		LastMiniblockHash:    lastHash,
		LastMiniblockNum:     lastNum,
		Nodes:                byteaArrayToSlice(nodesArray),
		ReplicationFactor:    repFactor,
		Sealed:               sealed,
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
                            s.genesis_miniblock_hash,
                            s.genesis_miniblock,
                            s.last_miniblock_hash,
                            s.last_miniblock_num,
                            s.replication_factor,
                            s.sealed,
                            COALESCE(n.nodes, '{}') AS nodes
                     FROM {{streams}} s
                     LEFT JOIN LATERAL (
                         SELECT array_agg(node_addr ORDER BY position) AS nodes
                         FROM {{nodes}} n WHERE n.stream_id = s.stream_id
                     ) n ON TRUE
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
					genesisHash []byte
					genesisMB   []byte
					lastHash    []byte
					lastNum     int64
					repFactor   uint32
					sealed      bool
					nodesArray  pgtype.FlatArray[[]byte]
				)
				if err := rows.Scan(
					&streamId,
					&genesisHash,
					&genesisMB,
					&lastHash,
					&lastNum,
					&repFactor,
					&sealed,
					&nodesArray,
				); err != nil {
					return err
				}

				records = append(records, &StreamMetadata{
					StreamId:             streamId,
					GenesisMiniblockHash: genesisHash,
					GenesisMiniblock:     genesisMB,
					LastMiniblockHash:    lastHash,
					LastMiniblockNum:     lastNum,
					Nodes:                byteaArrayToSlice(nodesArray),
					ReplicationFactor:    repFactor,
					Sealed:               sealed,
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
			rows, err := tx.Query(
				ctx,
				s.sqlForShard(
					`SELECT s.stream_id,
                            s.genesis_miniblock_hash,
                            s.genesis_miniblock,
                            s.last_miniblock_hash,
                            s.last_miniblock_num,
                            s.replication_factor,
                            s.sealed,
                            COALESCE(n.nodes, '{}') AS nodes
                     FROM {{streams}} s
                     JOIN {{nodes}} sn ON sn.stream_id = s.stream_id AND sn.node_addr = $1
                     LEFT JOIN LATERAL (
                         SELECT array_agg(node_addr ORDER BY position) AS nodes
                         FROM {{nodes}} n WHERE n.stream_id = s.stream_id
                     ) n ON TRUE
                     ORDER BY s.stream_id
                     OFFSET $2 LIMIT $3`,
					shardID,
				),
				node.Bytes(),
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
					genesisHash []byte
					genesisMB   []byte
					lastHash    []byte
					lastNum     int64
					repFactor   uint32
					sealed      bool
					nodesArray  pgtype.FlatArray[[]byte]
				)
				if err := rows.Scan(
					&streamId,
					&genesisHash,
					&genesisMB,
					&lastHash,
					&lastNum,
					&repFactor,
					&sealed,
					&nodesArray,
				); err != nil {
					return err
				}

				records = append(records, &StreamMetadata{
					StreamId:             streamId,
					GenesisMiniblockHash: genesisHash,
					GenesisMiniblock:     genesisMB,
					LastMiniblockHash:    lastHash,
					LastMiniblockNum:     lastNum,
					Nodes:                byteaArrayToSlice(nodesArray),
					ReplicationFactor:    repFactor,
					Sealed:               sealed,
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
			return tx.QueryRow(
				ctx,
				s.sqlForShard(`SELECT COUNT(*) FROM {{nodes}} WHERE node_addr = $1`, shardID),
				node.Bytes(),
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
                            s.genesis_miniblock_hash,
                            s.genesis_miniblock,
                            s.last_miniblock_hash,
                            s.last_miniblock_num,
                            s.replication_factor,
                            s.sealed,
                            COALESCE(n.nodes, '{}') AS nodes
                     FROM {{streams}} s
                     LEFT JOIN LATERAL (
                         SELECT array_agg(node_addr ORDER BY position) AS nodes
                         FROM {{nodes}} n WHERE n.stream_id = s.stream_id
                     ) n ON TRUE
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
					genesisHash []byte
					genesisMB   []byte
					lastHash    []byte
					lastNum     int64
					repFactor   uint32
					sealed      bool
					nodesArray  pgtype.FlatArray[[]byte]
				)
				if err := rows.Scan(
					&streamID,
					&genesisHash,
					&genesisMB,
					&lastHash,
					&lastNum,
					&repFactor,
					&sealed,
					&nodesArray,
				); err != nil {
					return err
				}

				records = append(records, &StreamMetadata{
					StreamId:             streamID,
					GenesisMiniblockHash: genesisHash,
					GenesisMiniblock:     genesisMB,
					LastMiniblockHash:    lastHash,
					LastMiniblockNum:     lastNum,
					Nodes:                byteaArrayToSlice(nodesArray),
					ReplicationFactor:    repFactor,
					Sealed:               sealed,
				})
			}

			return rows.Err()
		},
		nil,
		"shardId", shardID,
	)
	return records, err
}

func byteaArrayToSlice(arr pgtype.FlatArray[[]byte]) [][]byte {
	nodes := make([][]byte, 0, len(arr))
	for _, el := range arr {
		cp := make([]byte, len(el))
		copy(cp, el)
		nodes = append(nodes, cp)
	}
	return nodes
}

func (s *PostgresMetadataShardStore) ApplyMetadataTx(
	ctx context.Context,
	shardId uint64,
	height int64,
	tx *MetadataTx,
) error {
	if tx == nil {
		return RiverError(Err_INVALID_ARGUMENT, "tx is required")
	}
	switch op := tx.Op.(type) {
	case *MetadataTx_CreateStream:
		_, err := s.CreateStream(ctx, shardId, height, op.CreateStream)
		return err
	case *MetadataTx_SetStreamLastMiniblockBatch:
		return s.ApplyMiniblockBatch(ctx, shardId, height, op.SetStreamLastMiniblockBatch.Miniblocks)
	case *MetadataTx_UpdateStreamNodesAndReplication:
		_, err := s.UpdateStreamNodesAndReplication(ctx, shardId, height, op.UpdateStreamNodesAndReplication)
		return err
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown tx op")
	}
}

func (s *PostgresMetadataShardStore) ComputeAppHash(ctx context.Context, shardId uint64) ([]byte, error) {
	hasher := sha256.New()
	rows, err := s.store.pool.Query(ctx, s.sqlForShard(
		`SELECT stream_id, last_miniblock_hash, last_miniblock_num, replication_factor, sealed FROM {{streams}} ORDER BY stream_id`,
		shardId,
	))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			streamId          []byte
			lastHash          []byte
			lastNum           int64
			replicationFactor uint32
			sealed            bool
		)
		if err := rows.Scan(&streamId, &lastHash, &lastNum, &replicationFactor, &sealed); err != nil {
			return nil, err
		}
		hasher.Write(streamId)
		hasher.Write(lastHash)
		var buf [8]byte
		// lastNum
		binary.BigEndian.PutUint64(buf[:], uint64(lastNum))
		hasher.Write(buf[:])
		binary.BigEndian.PutUint64(buf[:], uint64(replicationFactor))
		hasher.Write(buf[:])
		if sealed {
			hasher.Write([]byte{1})
		} else {
			hasher.Write([]byte{0})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return hasher.Sum(nil), nil
}
