package storage

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"math"
	"slices"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"

	. "github.com/towns-protocol/towns/core/node/base"
	nodespkg "github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// MetadataShardState captures persisted shard info used by ABCI commit.
type MetadataShardState struct {
	LastHeight  int64
	LastAppHash []byte
}

// CommitOperation represents an operation to be committed atomically in Commit.
type CommitOperation struct {
	CreateStream    *CommitCreateStreamOp
	UpdateMiniblock *CommitUpdateMiniblockOp
	UpdateNodes     *CommitUpdateNodesOp
}

// CommitCreateStreamOp contains data for creating a new stream.
type CommitCreateStreamOp struct {
	StreamId             []byte
	GenesisMiniblockHash []byte
	GenesisMiniblock     []byte
	LastMiniblockHash    []byte
	LastMiniblockNum     int64
	ReplicationFactor    uint32
	Sealed               bool
	NodeIndexes          []int32
}

// CommitUpdateMiniblockOp contains data for updating a stream's miniblock pointer.
type CommitUpdateMiniblockOp struct {
	StreamId          []byte
	LastMiniblockHash []byte
	LastMiniblockNum  int64
	Sealed            bool
}

// CommitUpdateNodesOp contains data for updating a stream's nodes and/or replication.
type CommitUpdateNodesOp struct {
	StreamId          []byte
	ReplicationFactor uint32  // 0 means don't update
	NodeIndexes       []int32 // nil means don't update
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
	ComputeAppHash(ctx context.Context, shardId uint64, height int64) ([]byte, error)

	// ResolveNodeAddresses converts node addresses to permanent indexes.
	// Used during FinalizeBlock validation.
	ResolveNodeAddresses(nodes [][]byte) ([]int32, error)

	// CommitBlock atomically applies all operations and updates shard state.
	// This is called during Commit to persist all changes from FinalizeBlock.
	CommitBlock(
		ctx context.Context,
		shardId uint64,
		height int64,
		appHash []byte,
		operations []*CommitOperation,
	) error
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
				genesis_miniblock_hash BYTEA NOT NULL,
				genesis_miniblock BYTEA NOT NULL,
				last_miniblock_hash BYTEA NOT NULL,
				last_miniblock_num BIGINT NOT NULL,
				replication_factor INT NOT NULL,
				sealed BOOLEAN NOT NULL DEFAULT FALSE,
				nodes INT[] NOT NULL,
				CHECK (octet_length(stream_id) = 32),
				CHECK (octet_length(genesis_miniblock_hash) = 32),
				CHECK (octet_length(last_miniblock_hash) = 32),
				CHECK (last_miniblock_num >= 0),
				CHECK (replication_factor > 0),
				CHECK (array_length(nodes, 1) > 0)
			)`, shardId)); err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).
			Message("failed to create streams table").
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

// ResolveNodeAddresses converts node addresses to permanent indexes.
// This is used during FinalizeBlock validation to pre-resolve node addresses.
func (s *PostgresMetadataShardStore) ResolveNodeAddresses(nodes [][]byte) ([]int32, error) {
	return s.nodeIndexesForAddrs(nodes, true)
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
	nodeIndexes, err := s.nodeIndexesForAddrs(txData.Nodes, false)
	if err != nil {
		return nil, err
	}
	if txData.ReplicationFactor == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor must be greater than zero")
	}
	if int(txData.ReplicationFactor) > len(nodeIndexes) {
		return nil, RiverError(
			Err_INVALID_ARGUMENT,
			"replication_factor cannot exceed number of nodes",
			"replicationFactor", txData.ReplicationFactor,
			"numNodes", len(nodeIndexes),
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
		Nodes:                txData.Nodes,
		ReplicationFactor:    txData.ReplicationFactor,
		Sealed:               txData.Sealed,
		GenesisMiniblock:     genesisMiniblock,
	}
	return record, s.store.txRunner(
		ctx,
		"MetadataShard.CreateStream",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createStreamTx(ctx, tx, shardID, record, genesisMiniblock, nodeIndexes)
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
	nodeIndexes []int32,
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
    (stream_id, genesis_miniblock_hash, genesis_miniblock, last_miniblock_hash, last_miniblock_num, replication_factor, sealed, nodes)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8);`, shardID)

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
		nodeIndexes,
	); err != nil {
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
	if len(update.Nodes) == 0 && update.ReplicationFactor == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "nothing to update:nodes or replication_factor are required")
	}
	if err := validateStreamID(update.StreamId); err != nil {
		return nil, err
	}
	nodeIndexes, err := s.nodeIndexesForAddrs(update.Nodes, true)
	if err != nil {
		return nil, err
	}

	var result *StreamMetadata
	err = s.store.txRunner(
		ctx,
		"MetadataShard.UpdateStreamNodesAndReplication",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			record, innerErr := s.updateStreamNodesAndReplicationTx(
				ctx,
				tx,
				shardID,
				height,
				update.StreamId,
				update.ReplicationFactor,
				nodeIndexes,
			)
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
	streamId []byte,
	newReplicationFactor uint32,
	newNodeIndexes []int32,
) (*StreamMetadata, error) {
	_ = height

	var (
		currentReplicationFactor uint32
		sealed                   bool
		lastHash                 []byte
		lastNum                  int64
		genesisHash              []byte
		genesisMiniblock         []byte
		currentNodeIndexes       []int32
	)

	selectSQL := s.sqlForShard(
		`SELECT replication_factor,
                sealed,
                last_miniblock_hash,
                last_miniblock_num,
                genesis_miniblock_hash,
                genesis_miniblock,
                nodes
         FROM {{streams}} WHERE stream_id = $1 FOR UPDATE`,
		shardID,
	)
	if err := tx.QueryRow(
		ctx,
		selectSQL,
		streamId,
	).Scan(&currentReplicationFactor, &sealed, &lastHash, &lastNum, &genesisHash, &genesisMiniblock, &currentNodeIndexes); err != nil {
		if err == pgx.ErrNoRows {
			return nil, RiverError(Err_NOT_FOUND, "stream not found", "streamId", streamId)
		}
		return nil, err
	}

	switch {
	case newReplicationFactor > 0 && len(newNodeIndexes) > 0:
		if _, err := tx.Exec(ctx, s.sqlForShard(
			`UPDATE {{streams}}
			SET replication_factor = $2,
				nodes = $3
			WHERE stream_id = $1`,
			shardID,
		), streamId, newReplicationFactor, newNodeIndexes); err != nil {
			return nil, err
		}
		currentReplicationFactor = newReplicationFactor
		currentNodeIndexes = newNodeIndexes

	case newReplicationFactor > 0:
		if int(newReplicationFactor) > len(currentNodeIndexes) {
			return nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor cannot exceed number of nodes")
		}
		if _, err := tx.Exec(ctx, s.sqlForShard(
			`UPDATE {{streams}}
			SET replication_factor = $2
			WHERE stream_id = $1`,
			shardID,
		), streamId, newReplicationFactor); err != nil {
			return nil, err
		}
		currentReplicationFactor = newReplicationFactor

	case len(newNodeIndexes) > 0:
		if len(newNodeIndexes) < int(currentReplicationFactor) {
			return nil, RiverError(Err_INVALID_ARGUMENT, "nodes cannot be less than replication_factor")
		}
		if _, err := tx.Exec(ctx, s.sqlForShard(
			`UPDATE {{streams}}
			SET nodes = $2
			WHERE stream_id = $1`,
			shardID,
		), streamId, newNodeIndexes); err != nil {
			return nil, err
		}
		currentNodeIndexes = newNodeIndexes
	}

	nodesAddrs, err := s.nodeAddrsForIndexes(currentNodeIndexes)
	if err != nil {
		return nil, err
	}
	return &StreamMetadata{
		StreamId:             streamId,
		GenesisMiniblockHash: genesisHash,
		LastMiniblockHash:    lastHash,
		LastMiniblockNum:     lastNum,
		Nodes:                nodesAddrs,
		ReplicationFactor:    currentReplicationFactor,
		Sealed:               sealed,
		GenesisMiniblock:     genesisMiniblock,
	}, nil
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
		nodeIndexes []int32
	)

	query := s.sqlForShard(
		`SELECT genesis_miniblock_hash,
                genesis_miniblock,
                last_miniblock_hash,
                last_miniblock_num,
                replication_factor,
                sealed,
                nodes
         FROM {{streams}}
         WHERE stream_id = $1`,
		shardID,
	)

	if err := tx.QueryRow(ctx, query, streamId[:]).Scan(
		&genesisHash,
		&genesisMB,
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
		StreamId:             streamId[:],
		GenesisMiniblockHash: genesisHash,
		GenesisMiniblock:     genesisMB,
		LastMiniblockHash:    lastHash,
		LastMiniblockNum:     lastNum,
		Nodes:                nodesAddrs,
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
					genesisHash []byte
					genesisMB   []byte
					lastHash    []byte
					lastNum     int64
					repFactor   uint32
					sealed      bool
					nodeIndexes []int32
				)
				if err := rows.Scan(
					&streamId,
					&genesisHash,
					&genesisMB,
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
					StreamId:             streamId,
					GenesisMiniblockHash: genesisHash,
					GenesisMiniblock:     genesisMB,
					LastMiniblockHash:    lastHash,
					LastMiniblockNum:     lastNum,
					Nodes:                nodesAddrs,
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
	                            s.genesis_miniblock_hash,
	                            s.genesis_miniblock,
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
					genesisHash []byte
					genesisMB   []byte
					lastHash    []byte
					lastNum     int64
					repFactor   uint32
					sealed      bool
					nodeIndexes []int32
				)
				if err := rows.Scan(
					&streamId,
					&genesisHash,
					&genesisMB,
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
					StreamId:             streamId,
					GenesisMiniblockHash: genesisHash,
					GenesisMiniblock:     genesisMB,
					LastMiniblockHash:    lastHash,
					LastMiniblockNum:     lastNum,
					Nodes:                nodesAddrs,
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
	                            s.genesis_miniblock_hash,
	                            s.genesis_miniblock,
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
					genesisHash []byte
					genesisMB   []byte
					lastHash    []byte
					lastNum     int64
					repFactor   uint32
					sealed      bool
					nodeIndexes []int32
				)
				if err := rows.Scan(
					&streamID,
					&genesisHash,
					&genesisMB,
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
					StreamId:             streamID,
					GenesisMiniblockHash: genesisHash,
					GenesisMiniblock:     genesisMB,
					LastMiniblockHash:    lastHash,
					LastMiniblockNum:     lastNum,
					Nodes:                nodesAddrs,
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

// CommitBlock atomically applies all operations and updates shard state.
// This is called during Commit to persist all changes from FinalizeBlock.
// All operations are applied in order within a single transaction.
func (s *PostgresMetadataShardStore) CommitBlock(
	ctx context.Context,
	shardId uint64,
	height int64,
	appHash []byte,
	operations []*CommitOperation,
) error {
	if appHash == nil {
		appHash = []byte{}
	}

	return s.store.txRunner(
		ctx,
		"MetadataShard.CommitBlock",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			// Apply each operation in order
			for _, op := range operations {
				if op.CreateStream != nil {
					if err := s.commitCreateStreamTx(ctx, tx, shardId, op.CreateStream); err != nil {
						return err
					}
				}
				if op.UpdateMiniblock != nil {
					if err := s.commitUpdateMiniblockTx(ctx, tx, shardId, op.UpdateMiniblock); err != nil {
						return err
					}
				}
				if op.UpdateNodes != nil {
					if err := s.commitUpdateNodesTx(ctx, tx, shardId, op.UpdateNodes); err != nil {
						return err
					}
				}
			}

			// Update shard state
			updateSQL := `UPDATE metadata SET last_height = $1, last_app_hash = $2, updated_at = NOW() WHERE shard_id = $3`
			if _, err := tx.Exec(ctx, updateSQL, height, appHash, int64(shardId)); err != nil {
				return err
			}

			return nil
		},
		nil,
		"shardId", shardId,
		"height", height,
		"numOps", len(operations),
	)
}

// commitCreateStreamTx inserts a new stream record within a transaction.
// Validation has already been done in FinalizeBlock.
func (s *PostgresMetadataShardStore) commitCreateStreamTx(
	ctx context.Context,
	tx pgx.Tx,
	shardId uint64,
	op *CommitCreateStreamOp,
) error {
	insertSQL := s.sqlForShard(`
INSERT INTO {{streams}}
    (stream_id, genesis_miniblock_hash, genesis_miniblock, last_miniblock_hash, last_miniblock_num, replication_factor, sealed, nodes)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, shardId)

	_, err := tx.Exec(
		ctx,
		insertSQL,
		op.StreamId,
		op.GenesisMiniblockHash,
		op.GenesisMiniblock,
		op.LastMiniblockHash,
		op.LastMiniblockNum,
		op.ReplicationFactor,
		op.Sealed,
		op.NodeIndexes,
	)
	return err
}

// commitUpdateMiniblockTx updates a stream's miniblock pointer within a transaction.
// Validation has already been done in FinalizeBlock.
func (s *PostgresMetadataShardStore) commitUpdateMiniblockTx(
	ctx context.Context,
	tx pgx.Tx,
	shardId uint64,
	op *CommitUpdateMiniblockOp,
) error {
	updateSQL := s.sqlForShard(`
UPDATE {{streams}}
SET last_miniblock_hash = $2,
    last_miniblock_num = $3,
    sealed = $4
WHERE stream_id = $1`, shardId)

	_, err := tx.Exec(
		ctx,
		updateSQL,
		op.StreamId,
		op.LastMiniblockHash,
		op.LastMiniblockNum,
		op.Sealed,
	)
	return err
}

// commitUpdateNodesTx updates a stream's nodes and/or replication factor within a transaction.
// Validation has already been done in FinalizeBlock.
func (s *PostgresMetadataShardStore) commitUpdateNodesTx(
	ctx context.Context,
	tx pgx.Tx,
	shardId uint64,
	op *CommitUpdateNodesOp,
) error {
	switch {
	case op.ReplicationFactor > 0 && len(op.NodeIndexes) > 0:
		// Update both replication and nodes
		updateSQL := s.sqlForShard(`
UPDATE {{streams}}
SET replication_factor = $2, nodes = $3
WHERE stream_id = $1`, shardId)
		_, err := tx.Exec(ctx, updateSQL, op.StreamId, op.ReplicationFactor, op.NodeIndexes)
		return err

	case op.ReplicationFactor > 0:
		// Update only replication
		updateSQL := s.sqlForShard(`
UPDATE {{streams}}
SET replication_factor = $2
WHERE stream_id = $1`, shardId)
		_, err := tx.Exec(ctx, updateSQL, op.StreamId, op.ReplicationFactor)
		return err

	case len(op.NodeIndexes) > 0:
		// Update only nodes
		updateSQL := s.sqlForShard(`
UPDATE {{streams}}
SET nodes = $2
WHERE stream_id = $1`, shardId)
		_, err := tx.Exec(ctx, updateSQL, op.StreamId, op.NodeIndexes)
		return err

	default:
		// Nothing to update
		return nil
	}
}

func (s *PostgresMetadataShardStore) ComputeAppHash(
	_ context.Context,
	_ uint64,
	height int64,
) ([]byte, error) {
	// TEMPORARY: This "fake" app hash is only a hash of the block height.
	// It exists to unblock metadata shard development while the real app hash
	// (a fixed-depth sparse Merkle tree backed by Postgres) is implemented.
	if height < 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "height must be >= 0")
	}
	hasher := sha256.New()
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], uint64(height))
	hasher.Write(buf[:])
	return hasher.Sum(nil), nil
}
