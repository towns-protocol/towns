package storage

import (
	"bytes"
	"context"
	"testing"

	abci "github.com/cometbft/cometbft/abci/types"
	"github.com/stretchr/testify/require"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/metadata/mdstate"
	nodespkg "github.com/towns-protocol/towns/core/node/nodes"
	prot "github.com/towns-protocol/towns/core/node/protocol"
	protocolconnect "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

type fakeNodeRegistry struct{}

func (fakeNodeRegistry) GetNode(address common.Address) (*nodespkg.NodeRecord, error) {
	b := address.Bytes()
	if len(b) == 0 {
		return nil, base.RiverError(prot.Err_INVALID_ARGUMENT, "empty address")
	}
	idx := int(b[len(b)-1])
	return nodespkg.NewNodeRecordForTest(address, idx), nil
}

func (fakeNodeRegistry) GetNodeByPermanentIndex(index int32) (*nodespkg.NodeRecord, error) {
	if index < 0 || index > 255 {
		return nil, base.RiverError(prot.Err_INVALID_ARGUMENT, "index out of range", "index", index)
	}
	address := common.BytesToAddress(bytes.Repeat([]byte{byte(index)}, 20))
	return nodespkg.NewNodeRecordForTest(address, int(index)), nil
}

func (fakeNodeRegistry) GetAllNodes() []*nodespkg.NodeRecord {
	return nil
}

func (fakeNodeRegistry) GetStreamServiceClientForAddress(common.Address) (protocolconnect.StreamServiceClient, error) {
	return nil, base.RiverError(prot.Err_INTERNAL, "not implemented")
}

func (fakeNodeRegistry) GetNodeToNodeClientForAddress(common.Address) (protocolconnect.NodeToNodeClient, error) {
	return nil, base.RiverError(prot.Err_INTERNAL, "not implemented")
}

func (fakeNodeRegistry) GetValidNodeAddresses() []common.Address {
	return nil
}

func (fakeNodeRegistry) IsOperator(common.Address) bool {
	return false
}

func setupMetadataShardStoreTest(t *testing.T) (*PostgresMetadataShardStore, context.Context) {
	t.Helper()
	params := setupStreamStorageTest(t)

	store, err := NewPostgresMetadataShardStore(
		params.ctx,
		&params.pgStreamStore.PostgresEventStore,
		1,
		fakeNodeRegistry{},
	)
	require.NoError(t, err)

	return store, params.ctx
}

// Helper to create a PendingBlockState with proper initialization
func newPendingBlockState(height int64, txCount int) *mdstate.PendingBlockState {
	txResults := make([]*abci.ExecTxResult, txCount)
	for i := range txResults {
		txResults[i] = &abci.ExecTxResult{}
	}
	return &mdstate.PendingBlockState{
		Height:            height,
		Txs:               make([]*prot.MetadataTx, txCount),
		TxResults:         txResults,
		CreatedStreams:    make(map[shared.StreamId]*prot.CreateStreamTx),
		UpdatedStreams:    make(map[shared.StreamId]*prot.UpdateStreamNodesAndReplicationTx),
		UpdatedMiniblocks: make(map[shared.StreamId]*prot.MiniblockUpdate),
	}
}

// Helper to create and commit a stream
func createStreamWithBlock(
	t *testing.T,
	ctx context.Context,
	store *PostgresMetadataShardStore,
	shardID uint64,
	height int64,
	createTx *prot.CreateStreamTx,
) {
	t.Helper()

	pendingBlock := newPendingBlockState(height, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{CreateStream: createTx},
	}

	// Add events for the transaction
	pendingBlock.TxResults[0].Events = make([]abci.Event, 0)

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err)
	require.EqualValues(t, 0, pendingBlock.TxResults[0].Code, "create stream tx should succeed")

	err = store.CommitPendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err)
}

// Helper to apply miniblock batch
func applyMiniblockBatchWithBlock(
	t *testing.T,
	ctx context.Context,
	store *PostgresMetadataShardStore,
	shardID uint64,
	height int64,
	updates []*prot.MiniblockUpdate,
) error {
	t.Helper()

	pendingBlock := newPendingBlockState(height, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: updates,
			},
		},
	}

	// Add events for each miniblock update
	pendingBlock.TxResults[0].Events = make([]abci.Event, len(updates))

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	if err != nil {
		return err
	}

	// Check if any miniblock update had an error
	for i, event := range pendingBlock.TxResults[0].Events {
		if event.Type == "mberr" {
			for _, attr := range event.Attributes {
				if attr.Key == "code" {
					code := prot.Err(0)
					for _, r := range attr.Value {
						code = code*10 + prot.Err(r-'0')
					}
					return base.RiverError(code, "miniblock update failed", "index", i)
				}
			}
		}
	}

	return store.CommitPendingBlock(ctx, shardID, pendingBlock)
}

// Helper to update stream nodes and replication
func updateStreamNodesAndReplicationWithBlock(
	t *testing.T,
	ctx context.Context,
	store *PostgresMetadataShardStore,
	shardID uint64,
	height int64,
	updateTx *prot.UpdateStreamNodesAndReplicationTx,
) error {
	t.Helper()

	pendingBlock := newPendingBlockState(height, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_UpdateStreamNodesAndReplication{
			UpdateStreamNodesAndReplication: updateTx,
		},
	}

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	if err != nil {
		return err
	}

	if pendingBlock.TxResults[0].Code != 0 {
		return base.RiverError(prot.Err(pendingBlock.TxResults[0].Code), "update failed")
	}

	return store.CommitPendingBlock(ctx, shardID, pendingBlock)
}

func TestMetadataShardCreateAndGetStream(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)
	nodes := [][]byte{
		bytes.Repeat([]byte{0x10}, 20),
		bytes.Repeat([]byte{0x11}, 20),
		bytes.Repeat([]byte{0x12}, 20),
	}

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             nodes,
			ReplicationFactor: 2,
			Sealed:            false,
		},
	})

	fetched, err := store.GetStream(ctx, shardID, streamId)
	require.NoError(t, err)
	require.Equal(t, streamID, fetched.StreamId)
	require.EqualValues(t, genesisHash, fetched.LastMiniblockHash)
	require.EqualValues(t, 0, fetched.LastMiniblockNum)
	require.Len(t, fetched.Nodes, len(nodes))
	require.EqualValues(t, 2, fetched.ReplicationFactor)
}

func TestMetadataShardCreateDuplicate(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xbb}, 32)

	// Create first stream
	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	// Try to create duplicate - prepare should mark error
	pendingBlock := newPendingBlockState(2, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				Stream: &prot.StreamMetadata{
					StreamId:          streamID,
					LastMiniblockHash: genesisHash,
					LastMiniblockNum:  0,
					Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
					ReplicationFactor: 1,
				},
			},
		},
	}

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err) // PreparePendingBlock doesn't fail, it sets error codes
	require.Equal(t, uint32(prot.Err_ALREADY_EXISTS), pendingBlock.TxResults[0].Code)
}

func TestMetadataShardApplyMiniblockBatch(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xcc}, 32)

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	newHash := bytes.Repeat([]byte{0xdd}, 32)
	err := applyMiniblockBatchWithBlock(t, ctx, store, shardID, 2, []*prot.MiniblockUpdate{{
		StreamId:          streamID,
		PrevMiniblockHash: genesisHash,
		LastMiniblockHash: newHash,
		LastMiniblockNum:  1,
		Sealed:            true,
	}})
	require.NoError(t, err)

	fetched, err := store.GetStream(ctx, shardID, streamId)
	require.NoError(t, err)
	require.EqualValues(t, newHash, fetched.LastMiniblockHash)
	require.EqualValues(t, 1, fetched.LastMiniblockNum)
	require.True(t, fetched.Sealed)
}

func TestMetadataShardApplyMiniblockBatchSkipHeight(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xcc}, 32)

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	// Skipping miniblock height should fail validation (jumping from 0 to 3)
	err := applyMiniblockBatchWithBlock(t, ctx, store, shardID, 2, []*prot.MiniblockUpdate{{
		StreamId:          streamID,
		PrevMiniblockHash: genesisHash,
		LastMiniblockHash: bytes.Repeat([]byte{0xef}, 32),
		LastMiniblockNum:  3, // should be 1
	}})
	require.Error(t, err)
	require.Equal(t, prot.Err_BAD_BLOCK_NUMBER, base.AsRiverError(err).Code)
}

func TestMetadataShardApplyMiniblockBatchPrevHashMismatch(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xcc}, 32)

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	// First update succeeds
	firstNewHash := bytes.Repeat([]byte{0xdd}, 32)
	err := applyMiniblockBatchWithBlock(t, ctx, store, shardID, 2, []*prot.MiniblockUpdate{{
		StreamId:          streamID,
		PrevMiniblockHash: genesisHash,
		LastMiniblockHash: firstNewHash,
		LastMiniblockNum:  1,
	}})
	require.NoError(t, err)

	// Prev hash mismatch should fail (using stale genesis hash)
	err = applyMiniblockBatchWithBlock(t, ctx, store, shardID, 3, []*prot.MiniblockUpdate{{
		StreamId:          streamID,
		PrevMiniblockHash: genesisHash, // stale - should be firstNewHash
		LastMiniblockHash: bytes.Repeat([]byte{0xee}, 32),
		LastMiniblockNum:  2,
	}})
	require.Error(t, err)
	require.Equal(t, prot.Err_BAD_PREV_MINIBLOCK_HASH, base.AsRiverError(err).Code)
}

func TestMetadataShardUpdateNodesAndReplication(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	err := updateStreamNodesAndReplicationWithBlock(t, ctx, store, shardID, 2, &prot.UpdateStreamNodesAndReplicationTx{
		StreamId: streamID,
		Nodes: [][]byte{
			bytes.Repeat([]byte{0x02}, 20),
			bytes.Repeat([]byte{0x03}, 20),
		},
		ReplicationFactor: 2,
	})
	require.NoError(t, err)

	fetched, err := store.GetStream(ctx, shardID, streamId)
	require.NoError(t, err)
	require.EqualValues(t, 2, fetched.ReplicationFactor)
	require.Equal(t, 2, len(fetched.Nodes))
	require.Equal(t, bytes.Repeat([]byte{0x02}, 20), fetched.Nodes[0])
	require.Equal(t, bytes.Repeat([]byte{0x03}, 20), fetched.Nodes[1])
}

func TestMetadataShardCreateStreamPreservesNodeOrder(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xba}, 32)

	nodes := [][]byte{
		bytes.Repeat([]byte{0x10}, 20),
		bytes.Repeat([]byte{0x02}, 20),
		bytes.Repeat([]byte{0xff}, 20),
	}

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             nodes,
			ReplicationFactor: 3,
		},
	})

	record, err := store.GetStream(ctx, shardID, streamId)
	require.NoError(t, err)
	require.Equal(t, nodes, record.Nodes, "node order should be preserved")
}

func TestMetadataShardListAndCount(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	for i := 0; i < 3; i++ {
		id := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hash := bytes.Repeat([]byte{byte(0x90 + i)}, 32)
		createStreamWithBlock(t, ctx, store, shardID, int64(i+1), &prot.CreateStreamTx{
			Stream: &prot.StreamMetadata{
				StreamId:          id[:],
				LastMiniblockHash: hash,
				LastMiniblockNum:  0,
				Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20), bytes.Repeat([]byte{byte(0x20 + i)}, 20)},
				ReplicationFactor: 2,
			},
		})
	}

	count, err := store.CountStreams(ctx, shardID)
	require.NoError(t, err)
	require.EqualValues(t, 3, count)

	all, err := store.ListStreams(ctx, shardID, 0, 10)
	require.NoError(t, err)
	require.Len(t, all, 3)

	byNode, err := store.ListStreamsByNode(ctx, shardID, common.BytesToAddress(bytes.Repeat([]byte{0x01}, 20)), 0, 10)
	require.NoError(t, err)
	require.Len(t, byNode, 3)
}

func TestMetadataShardSealedAllowsNodeChange(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xab}, 32)

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
			Sealed:            true,
		},
	})

	err := updateStreamNodesAndReplicationWithBlock(t, ctx, store, shardID, 2, &prot.UpdateStreamNodesAndReplicationTx{
		StreamId: streamID,
		Nodes:    [][]byte{bytes.Repeat([]byte{0x02}, 20)},
	})
	require.NoError(t, err)

	fetched, err := store.GetStream(ctx, shardID, streamId)
	require.NoError(t, err)
	require.True(t, fetched.Sealed)
	require.Equal(t, [][]byte{bytes.Repeat([]byte{0x02}, 20)}, fetched.Nodes)
}

func TestMetadataShardCountsAndState(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamA := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamB := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	nodeA := common.BytesToAddress(bytes.Repeat([]byte{0xaa}, 20))
	nodeB := common.BytesToAddress(bytes.Repeat([]byte{0xbb}, 20))

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamA[:],
			LastMiniblockHash: bytes.Repeat([]byte{0x01}, 32),
			LastMiniblockNum:  0,
			Nodes:             [][]byte{nodeA.Bytes(), nodeB.Bytes()},
			ReplicationFactor: 2,
		},
	})

	createStreamWithBlock(t, ctx, store, shardID, 2, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamB[:],
			LastMiniblockHash: bytes.Repeat([]byte{0x02}, 32),
			LastMiniblockNum:  0,
			Nodes:             [][]byte{nodeB.Bytes()},
			ReplicationFactor: 1,
		},
	})

	total, err := store.CountStreams(ctx, shardID)
	require.NoError(t, err)
	require.EqualValues(t, 2, total)

	countByNodeA, err := store.CountStreamsByNode(ctx, shardID, nodeA)
	require.NoError(t, err)
	require.EqualValues(t, 1, countByNodeA)

	countByNodeB, err := store.CountStreamsByNode(ctx, shardID, nodeB)
	require.NoError(t, err)
	require.EqualValues(t, 2, countByNodeB)

	snapshot, err := store.GetStreamsStateSnapshot(ctx, shardID)
	require.NoError(t, err)
	require.Len(t, snapshot, 2)

	state, err := store.GetShardState(ctx, shardID)
	require.NoError(t, err)
	require.EqualValues(t, 2, state.LastHeight) // Height updated by CommitPendingBlock
}

func TestMetadataShardHeightMismatch(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)

	// Height 1 should work
	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamId[:],
			LastMiniblockHash: bytes.Repeat([]byte{0xaa}, 32),
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	// Height 3 should fail (should be 2)
	newStreamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	pendingBlock := newPendingBlockState(3, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				Stream: &prot.StreamMetadata{
					StreamId:          newStreamId[:],
					LastMiniblockHash: bytes.Repeat([]byte{0xbb}, 32),
					LastMiniblockNum:  0,
					Nodes:             [][]byte{bytes.Repeat([]byte{0x02}, 20)},
					ReplicationFactor: 1,
				},
			},
		},
	}

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	require.Error(t, err)
	require.Equal(t, prot.Err_FAILED_PRECONDITION, base.AsRiverError(err).Code)
}

func TestMetadataShardCommitHeightMismatch(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)

	// Create stream at height 1
	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamId[:],
			LastMiniblockHash: bytes.Repeat([]byte{0xaa}, 32),
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	// Prepare block at height 2
	newStreamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	pendingBlock := newPendingBlockState(2, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				Stream: &prot.StreamMetadata{
					StreamId:          newStreamId[:],
					LastMiniblockHash: bytes.Repeat([]byte{0xbb}, 32),
					LastMiniblockNum:  0,
					Nodes:             [][]byte{bytes.Repeat([]byte{0x02}, 20)},
					ReplicationFactor: 1,
				},
			},
		},
	}

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err)

	// Manually change height to wrong value to test commit validation
	pendingBlock.Height = 5

	err = store.CommitPendingBlock(ctx, shardID, pendingBlock)
	require.Error(t, err)
	require.Equal(t, prot.Err_FAILED_PRECONDITION, base.AsRiverError(err).Code)
}

func TestMetadataShardPreparePendingBlockValidation(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	// Create a stream first
	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamId[:],
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	t.Run("NilTxIsSkipped", func(t *testing.T) {
		nilTestStreamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		pendingBlock := newPendingBlockState(2, 2)
		pendingBlock.Txs[0] = nil // nil tx should be skipped
		pendingBlock.Txs[1] = &prot.MetadataTx{
			Op: &prot.MetadataTx_CreateStream{
				CreateStream: &prot.CreateStreamTx{
					Stream: &prot.StreamMetadata{
						StreamId:          nilTestStreamId[:],
						LastMiniblockHash: bytes.Repeat([]byte{0xcc}, 32),
						LastMiniblockNum:  0,
						Nodes:             [][]byte{bytes.Repeat([]byte{0x03}, 20)},
						ReplicationFactor: 1,
					},
				},
			},
		}

		err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
		require.NoError(t, err)
		require.NotNil(t, pendingBlock.AppHash)
	})

	t.Run("DuplicateStreamInSameBlock", func(t *testing.T) {
		newStreamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)

		pendingBlock := newPendingBlockState(2, 2)
		createTx := &prot.CreateStreamTx{
			Stream: &prot.StreamMetadata{
				StreamId:          newStreamId[:],
				LastMiniblockHash: bytes.Repeat([]byte{0xdd}, 32),
				LastMiniblockNum:  0,
				Nodes:             [][]byte{bytes.Repeat([]byte{0x04}, 20)},
				ReplicationFactor: 1,
			},
		}
		pendingBlock.Txs[0] = &prot.MetadataTx{
			Op: &prot.MetadataTx_CreateStream{CreateStream: createTx},
		}
		pendingBlock.Txs[1] = &prot.MetadataTx{
			Op: &prot.MetadataTx_CreateStream{CreateStream: createTx},
		}

		err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
		require.NoError(t, err)
		require.EqualValues(t, 0, pendingBlock.TxResults[0].Code, "first create should succeed")
		require.Equal(t, uint32(prot.Err_ALREADY_EXISTS), pendingBlock.TxResults[1].Code, "second create should fail")
	})
}

func TestMetadataShardSealedStreamBlocksMiniblockUpdate(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)

	// Create sealed stream
	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
			Sealed:            true,
		},
	})

	// Try to update miniblock on sealed stream - should fail
	err := applyMiniblockBatchWithBlock(t, ctx, store, shardID, 2, []*prot.MiniblockUpdate{{
		StreamId:          streamID,
		PrevMiniblockHash: genesisHash,
		LastMiniblockHash: bytes.Repeat([]byte{0xbb}, 32),
		LastMiniblockNum:  1,
	}})
	require.Error(t, err)
}

func TestMetadataShardDuplicateMiniblockUpdateInSameBlock(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)

	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	// Try to update same stream twice in same block
	pendingBlock := newPendingBlockState(2, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{
					{
						StreamId:          streamID,
						PrevMiniblockHash: genesisHash,
						LastMiniblockHash: bytes.Repeat([]byte{0xbb}, 32),
						LastMiniblockNum:  1,
					},
					{
						StreamId:          streamID,
						PrevMiniblockHash: bytes.Repeat([]byte{0xbb}, 32),
						LastMiniblockHash: bytes.Repeat([]byte{0xcc}, 32),
						LastMiniblockNum:  2,
					},
				},
			},
		},
	}
	pendingBlock.TxResults[0].Events = make([]abci.Event, 2)

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err)

	// First update should succeed with mbok, second should fail due to duplicate
	require.Equal(t, "mbok", pendingBlock.TxResults[0].Events[0].Type, "first update should have mbok event")
	require.Equal(t, "mberr", pendingBlock.TxResults[0].Events[1].Type, "second update should have mberr event")
}

func TestMetadataShardMultipleTxTypesInBlock(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)

	// Block with create stream tx
	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamID,
			LastMiniblockHash: genesisHash,
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	// Block with multiple tx types
	newStreamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	pendingBlock := newPendingBlockState(2, 3)

	// Create stream tx
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				Stream: &prot.StreamMetadata{
					StreamId:          newStreamId[:],
					LastMiniblockHash: bytes.Repeat([]byte{0xbb}, 32),
					LastMiniblockNum:  0,
					Nodes:             [][]byte{bytes.Repeat([]byte{0x02}, 20)},
					ReplicationFactor: 1,
				},
			},
		},
	}

	// Miniblock update tx
	pendingBlock.Txs[1] = &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{{
					StreamId:          streamID,
					PrevMiniblockHash: genesisHash,
					LastMiniblockHash: bytes.Repeat([]byte{0xcc}, 32),
					LastMiniblockNum:  1,
				}},
			},
		},
	}
	pendingBlock.TxResults[1].Events = make([]abci.Event, 1)

	// Update nodes tx
	pendingBlock.Txs[2] = &prot.MetadataTx{
		Op: &prot.MetadataTx_UpdateStreamNodesAndReplication{
			UpdateStreamNodesAndReplication: &prot.UpdateStreamNodesAndReplicationTx{
				StreamId:          streamID,
				Nodes:             [][]byte{bytes.Repeat([]byte{0x03}, 20), bytes.Repeat([]byte{0x04}, 20)},
				ReplicationFactor: 2,
			},
		},
	}

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err)

	// All txs should succeed
	for i := range pendingBlock.TxResults {
		require.EqualValues(t, 0, pendingBlock.TxResults[i].Code, "tx %d should succeed", i)
	}

	err = store.CommitPendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err)

	// Verify results
	count, err := store.CountStreams(ctx, shardID)
	require.NoError(t, err)
	require.EqualValues(t, 2, count)

	fetched, err := store.GetStream(ctx, shardID, streamId)
	require.NoError(t, err)
	require.EqualValues(t, 1, fetched.LastMiniblockNum)
	require.EqualValues(t, 2, fetched.ReplicationFactor)
	require.Len(t, fetched.Nodes, 2)
}

func TestMetadataShardUpdateStreamNotFound(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	// Create a dummy stream first to advance height
	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	createStreamWithBlock(t, ctx, store, shardID, 1, &prot.CreateStreamTx{
		Stream: &prot.StreamMetadata{
			StreamId:          streamId[:],
			LastMiniblockHash: bytes.Repeat([]byte{0xaa}, 32),
			LastMiniblockNum:  0,
			Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
			ReplicationFactor: 1,
		},
	})

	// Try to update non-existent stream
	nonExistentStreamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	pendingBlock := newPendingBlockState(2, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_UpdateStreamNodesAndReplication{
			UpdateStreamNodesAndReplication: &prot.UpdateStreamNodesAndReplicationTx{
				StreamId:          nonExistentStreamId[:],
				Nodes:             [][]byte{bytes.Repeat([]byte{0x02}, 20)},
				ReplicationFactor: 1,
			},
		},
	}

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err)
	require.Equal(t, uint32(prot.Err_NOT_FOUND), pendingBlock.TxResults[0].Code)
}

func TestMetadataShardGetStreamNotFound(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	nonExistentStreamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	_, err := store.GetStream(ctx, shardID, nonExistentStreamId)
	require.Error(t, err)
	require.Equal(t, prot.Err_NOT_FOUND, base.AsRiverError(err).Code)
}

func TestMetadataShardInvalidNodeAddress(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)

	// Invalid node address (wrong length)
	pendingBlock := newPendingBlockState(1, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				Stream: &prot.StreamMetadata{
					StreamId:          streamId[:],
					LastMiniblockHash: bytes.Repeat([]byte{0xaa}, 32),
					LastMiniblockNum:  0,
					Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 19)}, // 19 bytes instead of 20
					ReplicationFactor: 1,
				},
			},
		},
	}

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err)
	// The error is set via SetTxError for invalid node address
	require.NotZero(t, pendingBlock.TxResults[0].Code)
}

func TestMetadataShardDuplicateNodesInList(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	duplicateNode := bytes.Repeat([]byte{0x01}, 20)

	pendingBlock := newPendingBlockState(1, 1)
	pendingBlock.Txs[0] = &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				Stream: &prot.StreamMetadata{
					StreamId:          streamId[:],
					LastMiniblockHash: bytes.Repeat([]byte{0xaa}, 32),
					LastMiniblockNum:  0,
					Nodes:             [][]byte{duplicateNode, duplicateNode}, // duplicate nodes
					ReplicationFactor: 2,
				},
			},
		},
	}

	err := store.PreparePendingBlock(ctx, shardID, pendingBlock)
	require.NoError(t, err)
	require.NotZero(t, pendingBlock.TxResults[0].Code, "duplicate nodes should fail validation")
}
