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
	"sync"

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

type PostgresMetadataShardStore struct {
	store    *PostgresEventStore
	registry nodespkg.NodeRegistry

	mu            sync.Mutex
	cachedStreams map[uint64]map[string]*StreamMetadata
	staged        map[uint64]*stagedMetadataChanges
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
	CommitMetadata(ctx context.Context, shardId uint64, height int64, appHash []byte) error
	ComputeAppHash(ctx context.Context, shardId uint64, height int64) ([]byte, error)
}

var _ MetadataStore = (*PostgresMetadataShardStore)(nil)

type stagedOp interface {
	apply(ctx context.Context, tx pgx.Tx, store *PostgresMetadataShardStore, shardID uint64) error
}

type stagedMetadataChanges struct {
	height  int64
	streams map[string]*StreamMetadata
	ops     []stagedOp
}

type stagedCreateStreamOp struct {
	record           *StreamMetadata
	genesisMiniblock []byte
	nodeIndexes      []int32
}

func (op *stagedCreateStreamOp) apply(ctx context.Context, tx pgx.Tx, store *PostgresMetadataShardStore, shardID uint64) error {
	return store.createStreamTx(ctx, tx, shardID, op.record, op.genesisMiniblock, op.nodeIndexes)
}

type stagedMiniblockBatchOp struct {
	updates []*MiniblockUpdate
}

func (op *stagedMiniblockBatchOp) apply(ctx context.Context, tx pgx.Tx, store *PostgresMetadataShardStore, shardID uint64) error {
	for _, update := range op.updates {
		if err := store.applyMiniblockUpdateTx(ctx, tx, shardID, 0, update); err != nil {
			return err
		}
	}
	return nil
}

type stagedUpdateNodesOp struct {
	streamID          []byte
	replicationFactor uint32
	nodeIndexes       []int32
}

func (op *stagedUpdateNodesOp) apply(ctx context.Context, tx pgx.Tx, store *PostgresMetadataShardStore, shardID uint64) error {
	_, err := store.updateStreamNodesAndReplicationTx(
		ctx,
		tx,
		shardID,
		0,
		op.streamID,
		op.replicationFactor,
		op.nodeIndexes,
	)
	return err
}

func streamKey(streamID []byte) string {
	return string(streamID)
}

func copyBytes(data []byte) []byte {
	if data == nil {
		return nil
	}
	out := make([]byte, len(data))
	copy(out, data)
	return out
}

func cloneNodes(nodes [][]byte) [][]byte {
	if nodes == nil {
		return nil
	}
	out := make([][]byte, len(nodes))
	for i, n := range nodes {
		out[i] = copyBytes(n)
	}
	return out
}

func cloneStreamMetadata(record *StreamMetadata) *StreamMetadata {
	if record == nil {
		return nil
	}
	return &StreamMetadata{
		StreamId:             copyBytes(record.StreamId),
		GenesisMiniblockHash: copyBytes(record.GenesisMiniblockHash),
		GenesisMiniblock:     copyBytes(record.GenesisMiniblock),
		LastMiniblockHash:    copyBytes(record.LastMiniblockHash),
		LastMiniblockNum:     record.LastMiniblockNum,
		Nodes:                cloneNodes(record.Nodes),
		ReplicationFactor:    record.ReplicationFactor,
		Sealed:               record.Sealed,
	}
}

func cloneStreamMap(src map[string]*StreamMetadata) map[string]*StreamMetadata {
	out := make(map[string]*StreamMetadata, len(src))
	for key, record := range src {
		out[key] = cloneStreamMetadata(record)
	}
	return out
}

func cloneMiniblockUpdates(updates []*MiniblockUpdate) []*MiniblockUpdate {
	out := make([]*MiniblockUpdate, 0, len(updates))
	for _, update := range updates {
		if update == nil {
			continue
		}
		out = append(out, &MiniblockUpdate{
			StreamId:          copyBytes(update.StreamId),
			PrevMiniblockHash: copyBytes(update.PrevMiniblockHash),
			LastMiniblockHash: copyBytes(update.LastMiniblockHash),
			LastMiniblockNum:  update.LastMiniblockNum,
			Sealed:            update.Sealed,
		})
	}
	return out
}

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
		store:         eventStore,
		registry:      registry,
		cachedStreams: make(map[uint64]map[string]*StreamMetadata),
		staged:        make(map[uint64]*stagedMetadataChanges),
	}

	if err := store.EnsureShardStorage(ctx, shardId); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresMetadataShardStore")
	}

	if err := store.loadStreamsCache(ctx, shardId); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresMetadataShardStore.loadCache")
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

func (s *PostgresMetadataShardStore) loadStreamsCache(ctx context.Context, shardId uint64) error {
	snapshot, err := s.GetStreamsStateSnapshot(ctx, shardId)
	if err != nil {
		return err
	}

	streams := make(map[string]*StreamMetadata, len(snapshot))
	for _, record := range snapshot {
		streams[streamKey(record.StreamId)] = cloneStreamMetadata(record)
	}

	s.mu.Lock()
	s.cachedStreams[shardId] = streams
	s.mu.Unlock()
	return nil
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

func (s *PostgresMetadataShardStore) buildStreamRecord(
	txData *CreateStreamTx,
) (*StreamMetadata, []int32, []byte, error) {
	if txData == nil {
		return nil, nil, nil, RiverError(Err_INVALID_ARGUMENT, "create stream payload is required")
	}
	if err := validateStreamID(txData.StreamId); err != nil {
		return nil, nil, nil, err
	}
	if err := validateHash(txData.GenesisMiniblockHash, "genesis_miniblock_hash"); err != nil {
		return nil, nil, nil, err
	}
	nodeIndexes, err := s.nodeIndexesForAddrs(txData.Nodes, false)
	if err != nil {
		return nil, nil, nil, err
	}
	if txData.ReplicationFactor == 0 {
		return nil, nil, nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor must be greater than zero")
	}
	if int(txData.ReplicationFactor) > len(nodeIndexes) {
		return nil, nil, nil, RiverError(
			Err_INVALID_ARGUMENT,
			"replication_factor cannot exceed number of nodes",
			"replicationFactor", txData.ReplicationFactor,
			"numNodes", len(nodeIndexes),
		)
	}
	if txData.LastMiniblockNum > math.MaxInt64 {
		return nil, nil, nil, RiverError(Err_INVALID_ARGUMENT, "last_miniblock_num too large")
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
			return nil, nil, nil, RiverError(Err_INVALID_ARGUMENT, "genesis_miniblock required when last_miniblock_num is 0")
		}
		if len(txData.LastMiniblockHash) > 0 && !bytes.Equal(txData.LastMiniblockHash, txData.GenesisMiniblockHash) {
			return nil, nil, nil, RiverError(
				Err_INVALID_ARGUMENT,
				"last_miniblock_hash must match genesis_miniblock_hash when last_miniblock_num is 0",
			)
		}
		lastMiniblockHash = txData.GenesisMiniblockHash
	} else {
		if err := validateHash(txData.LastMiniblockHash, "last_miniblock_hash"); err != nil {
			return nil, nil, nil, err
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
	return record, nodeIndexes, genesisMiniblock, nil
}

func validateMiniblockUpdates(updates []*MiniblockUpdate) error {
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
	return nil
}

func (s *PostgresMetadataShardStore) applyMiniblockUpdatesInMemory(
	streams map[string]*StreamMetadata,
	updates []*MiniblockUpdate,
) error {
	if err := validateMiniblockUpdates(updates); err != nil {
		return err
	}

	for _, update := range updates {
		stream, ok := streams[streamKey(update.StreamId)]
		if !ok {
			return RiverError(Err_NOT_FOUND, "stream not found", "streamId", update.StreamId)
		}
		if stream.Sealed {
			return RiverError(Err_FAILED_PRECONDITION, "stream is sealed", "streamId", update.StreamId)
		}

		if !bytes.Equal(stream.LastMiniblockHash, update.PrevMiniblockHash) {
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
		if nextNum != stream.LastMiniblockNum+1 {
			return RiverError(
				Err_FAILED_PRECONDITION,
				"last_miniblock_num must increase by 1",
				"streamId", update.StreamId,
				"current", stream.LastMiniblockNum,
				"proposed", nextNum,
			)
		}

		stream.LastMiniblockHash = copyBytes(update.LastMiniblockHash)
		stream.LastMiniblockNum = nextNum
		if update.Sealed {
			stream.Sealed = true
		}
	}
	return nil
}

func (s *PostgresMetadataShardStore) applyUpdateNodesAndReplicationInMemory(
	streams map[string]*StreamMetadata,
	update *UpdateStreamNodesAndReplicationTx,
) ([]int32, error) {
	if update == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "update payload is required")
	}
	if len(update.Nodes) == 0 && update.ReplicationFactor == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "nothing to update:nodes or replication_factor are required")
	}
	if err := validateStreamID(update.StreamId); err != nil {
		return nil, err
	}

	stream, ok := streams[streamKey(update.StreamId)]
	if !ok {
		return nil, RiverError(Err_NOT_FOUND, "stream not found", "streamId", update.StreamId)
	}

	nodeIndexes, err := s.nodeIndexesForAddrs(update.Nodes, true)
	if err != nil {
		return nil, err
	}

	currentNodeIndexes, err := s.nodeIndexesForAddrs(stream.Nodes, false)
	if err != nil {
		return nil, err
	}

	switch {
	case update.ReplicationFactor > 0 && len(nodeIndexes) > 0:
		addrs, err := s.nodeAddrsForIndexes(nodeIndexes)
		if err != nil {
			return nil, err
		}
		stream.ReplicationFactor = update.ReplicationFactor
		stream.Nodes = cloneNodes(addrs)

	case update.ReplicationFactor > 0:
		if int(update.ReplicationFactor) > len(currentNodeIndexes) {
			return nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor cannot exceed number of nodes")
		}
		stream.ReplicationFactor = update.ReplicationFactor

	case len(nodeIndexes) > 0:
		if len(nodeIndexes) < int(stream.ReplicationFactor) {
			return nil, RiverError(Err_INVALID_ARGUMENT, "nodes cannot be less than replication_factor")
		}
		addrs, err := s.nodeAddrsForIndexes(nodeIndexes)
		if err != nil {
			return nil, err
		}
		stream.Nodes = cloneNodes(addrs)
	}

	return nodeIndexes, nil
}

func (s *PostgresMetadataShardStore) ensureCacheMapLocked(shardID uint64) map[string]*StreamMetadata {
	if s.cachedStreams == nil {
		s.cachedStreams = make(map[uint64]map[string]*StreamMetadata)
	}
	cache := s.cachedStreams[shardID]
	if cache == nil {
		cache = make(map[string]*StreamMetadata)
		s.cachedStreams[shardID] = cache
	}
	return cache
}

func (s *PostgresMetadataShardStore) stagedStateLocked(
	shardID uint64,
	height int64,
) (*stagedMetadataChanges, error) {
	if s.staged == nil {
		s.staged = make(map[uint64]*stagedMetadataChanges)
	}
	cache := s.ensureCacheMapLocked(shardID)

	staged := s.staged[shardID]
	if staged != nil && staged.height != height {
		return nil, RiverError(
			Err_FAILED_PRECONDITION,
			"staged metadata height mismatch",
			"stagedHeight", staged.height,
			"requestedHeight", height,
		)
	}

	if staged == nil {
		staged = &stagedMetadataChanges{
			height:  height,
			streams: cloneStreamMap(cache),
		}
		s.staged[shardID] = staged
	}

	return staged, nil
}

func (s *PostgresMetadataShardStore) CreateStream(
	ctx context.Context,
	shardID uint64,
	height int64,
	txData *CreateStreamTx,
) (*StreamMetadata, error) {
	_ = height

	record, nodeIndexes, genesisMiniblock, err := s.buildStreamRecord(txData)
	if err != nil {
		return nil, err
	}
	err = s.store.txRunner(
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
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	cache := s.ensureCacheMapLocked(shardID)
	cache[streamKey(record.StreamId)] = cloneStreamMetadata(record)
	s.mu.Unlock()

	return record, nil
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
	if err := validateMiniblockUpdates(updates); err != nil {
		return err
	}

	if err := s.store.txRunner(
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
	); err != nil {
		return err
	}

	s.mu.Lock()
	cache := s.ensureCacheMapLocked(shardID)
	cacheErr := s.applyMiniblockUpdatesInMemory(cache, updates)
	s.mu.Unlock()

	if cacheErr != nil {
		return s.loadStreamsCache(ctx, shardID)
	}

	return nil
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
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	cache := s.ensureCacheMapLocked(shardID)
	_, cacheErr := s.applyUpdateNodesAndReplicationInMemory(cache, update)
	s.mu.Unlock()
	if cacheErr != nil {
		_ = s.loadStreamsCache(ctx, shardID)
	}

	return result, nil
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

func (s *PostgresMetadataShardStore) updateShardStateTx(
	ctx context.Context,
	tx pgx.Tx,
	shardID uint64,
	height int64,
	appHash []byte,
) error {
	if appHash == nil {
		appHash = []byte{}
	}
	updateSQL := `UPDATE metadata SET last_height = $1, last_app_hash = $2 WHERE shard_id = $3`
	_, err := tx.Exec(ctx, updateSQL, height, appHash, shardID)
	return err
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
			return s.updateShardStateTx(ctx, tx, shardID, height, appHash)
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

func (s *PostgresMetadataShardStore) ApplyMetadataTx(
	ctx context.Context,
	shardId uint64,
	height int64,
	tx *MetadataTx,
) error {
	if tx == nil {
		return RiverError(Err_INVALID_ARGUMENT, "tx is required")
	}

	s.mu.Lock()
	staged, err := s.stagedStateLocked(shardId, height)
	if err != nil {
		s.mu.Unlock()
		return err
	}

	var applyErr error
	switch op := tx.Op.(type) {
	case *MetadataTx_CreateStream:
		var (
			record           *StreamMetadata
			nodeIndexes      []int32
			genesisMiniblock []byte
		)
		record, nodeIndexes, genesisMiniblock, applyErr = s.buildStreamRecord(op.CreateStream)
		if applyErr != nil {
			break
		}

		key := streamKey(record.StreamId)
		if _, exists := staged.streams[key]; exists {
			applyErr = RiverError(Err_ALREADY_EXISTS, "stream already exists", "streamId", record.StreamId)
			break
		}

		staged.streams[key] = cloneStreamMetadata(record)
		staged.ops = append(staged.ops, &stagedCreateStreamOp{
			record:           cloneStreamMetadata(record),
			genesisMiniblock: copyBytes(genesisMiniblock),
			nodeIndexes:      append([]int32(nil), nodeIndexes...),
		})
	case *MetadataTx_SetStreamLastMiniblockBatch:
		applyErr = s.applyMiniblockUpdatesInMemory(staged.streams, op.SetStreamLastMiniblockBatch.Miniblocks)
		if applyErr == nil {
			staged.ops = append(staged.ops, &stagedMiniblockBatchOp{
				updates: cloneMiniblockUpdates(op.SetStreamLastMiniblockBatch.Miniblocks),
			})
		}
	case *MetadataTx_UpdateStreamNodesAndReplication:
		var nodeIndexes []int32
		nodeIndexes, applyErr = s.applyUpdateNodesAndReplicationInMemory(
			staged.streams,
			op.UpdateStreamNodesAndReplication,
		)
		if applyErr == nil {
			staged.ops = append(staged.ops, &stagedUpdateNodesOp{
				streamID:          copyBytes(op.UpdateStreamNodesAndReplication.StreamId),
				replicationFactor: op.UpdateStreamNodesAndReplication.ReplicationFactor,
				nodeIndexes:       append([]int32(nil), nodeIndexes...),
			})
		}
	default:
		applyErr = RiverError(Err_INVALID_ARGUMENT, "unknown tx op")
	}

	s.mu.Unlock()
	return applyErr
}

func (s *PostgresMetadataShardStore) CommitMetadata(
	ctx context.Context,
	shardId uint64,
	height int64,
	appHash []byte,
) error {
	s.mu.Lock()
	staged := s.staged[shardId]
	if staged != nil && staged.height != height {
		s.mu.Unlock()
		return RiverError(
			Err_FAILED_PRECONDITION,
			"staged metadata height mismatch",
			"stagedHeight", staged.height,
			"commitHeight", height,
		)
	}

	var (
		ops           []stagedOp
		stagedStreams map[string]*StreamMetadata
	)
	if staged != nil {
		ops = append(ops, staged.ops...)
		stagedStreams = cloneStreamMap(staged.streams)
	}
	s.mu.Unlock()

	opCount := len(ops)

	if err := s.store.txRunner(
		ctx,
		"MetadataShard.CommitMetadata",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			for _, op := range ops {
				if err := op.apply(ctx, tx, s, shardId); err != nil {
					return err
				}
			}
			return s.updateShardStateTx(ctx, tx, shardId, height, appHash)
		},
		nil,
		"shardId", shardId,
		"height", height,
		"numOps", opCount,
	); err != nil {
		return err
	}

	s.mu.Lock()
	if stagedStreams != nil {
		s.cachedStreams[shardId] = stagedStreams
	}
	delete(s.staged, shardId)
	s.mu.Unlock()

	return nil
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
