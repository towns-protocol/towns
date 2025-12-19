package metadata

import (
	"bytes"
	"context"
	"testing"

	abci "github.com/cometbft/cometbft/abci/types"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/logging"
	nodespkg "github.com/towns-protocol/towns/core/node/nodes"
	prot "github.com/towns-protocol/towns/core/node/protocol"
	protocolconnect "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
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

type metadataTestEnv struct {
	shard *MetadataShard
	store *storage.PostgresMetadataShardStore
	ctx   context.Context
}

func setupMetadataShardTest(t *testing.T) metadataTestEnv {
	t.Helper()
	ctx := test.NewTestContext(t)

	storeSetup := setupMetadataStore(t, ctx, 1, fakeNodeRegistry{})

	shard := &MetadataShard{
		opts: MetadataShardOpts{
			ShardID: 1,
			Store:   storeSetup.shardStore,
		},
		chainID: chainIDForShard(1),
		store:   storeSetup.shardStore,
		log:     logging.FromCtx(ctx),
	}

	t.Cleanup(storeSetup.cleanup)

	return metadataTestEnv{
		shard: shard,
		store: storeSetup.shardStore,
		ctx:   ctx,
	}
}

func buildCreateStreamTx(streamID shared.StreamId, genesisHash []byte) *prot.MetadataTx {
	return &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				Stream: &prot.StreamMetadata{
					StreamId:          streamID[:],
					LastMiniblockHash: genesisHash,
					LastMiniblockNum:  0,
					Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
					ReplicationFactor: 1,
				},
			},
		},
	}
}

func TestMetadataShardCheckTxValidation(t *testing.T) {
	env := setupMetadataShardTest(t)

	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0x01}, 32)

	validTxBytes, err := proto.Marshal(buildCreateStreamTx(streamID, genesisHash))
	require.NoError(t, err)

	res, err := env.shard.CheckTx(env.ctx, &abci.CheckTxRequest{Tx: validTxBytes})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, res.Code)

	invalid := &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				Stream: &prot.StreamMetadata{
					StreamId:          []byte{0x01, 0x02}, // invalid length
					LastMiniblockHash: bytes.Repeat([]byte{0x01}, 32),
					LastMiniblockNum:  0,
					Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
					ReplicationFactor: 1,
				},
			},
		},
	}
	invalidBytes, err := proto.Marshal(invalid)
	require.NoError(t, err)

	res, err = env.shard.CheckTx(env.ctx, &abci.CheckTxRequest{Tx: invalidBytes})
	require.NoError(t, err)
	require.NotEqual(t, abci.CodeTypeOK, res.Code)
}

func TestMetadataShardFinalizeBlockAndQuery(t *testing.T) {
	env := setupMetadataShardTest(t)

	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)

	// Block 1: Create the stream
	createTxBytes, err := proto.Marshal(buildCreateStreamTx(streamID, genesisHash))
	require.NoError(t, err)

	resp, err := env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 1,
		Txs:    [][]byte{createTxBytes},
	})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	// Block 2: Update the stream
	updatedHash := bytes.Repeat([]byte{0xbb}, 32)
	updateTx := &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{{
					StreamId:          streamID[:],
					PrevMiniblockHash: genesisHash,
					LastMiniblockHash: updatedHash,
					LastMiniblockNum:  1,
					Sealed:            true,
				}},
			},
		},
	}
	updateTxBytes, err := proto.Marshal(updateTx)
	require.NoError(t, err)

	resp, err = env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 2,
		Txs:    [][]byte{updateTxBytes},
	})
	require.NoError(t, err)
	require.Len(t, resp.TxResults, 1)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)
	// Verify successful update has "mbok" event
	require.Len(t, resp.TxResults[0].Events, 1)
	require.Equal(t, "mbok", resp.TxResults[0].Events[0].Type)

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	info, err := env.shard.Info(env.ctx, &abci.InfoRequest{})
	require.NoError(t, err)
	require.EqualValues(t, 2, info.LastBlockHeight)
	require.NotEmpty(t, info.LastBlockAppHash)

	queryResp, err := env.shard.Query(env.ctx, &abci.QueryRequest{Path: "/stream/" + streamID.String()})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, queryResp.Code)

	var metadata prot.StreamMetadata
	require.NoError(t, protojson.Unmarshal(queryResp.Value, &metadata))
	require.Equal(t, streamID[:], metadata.StreamId)
	require.Equal(t, updatedHash, metadata.LastMiniblockHash)
	require.EqualValues(t, 1, metadata.LastMiniblockNum)
	require.True(t, metadata.Sealed)
}

func TestMetadataShardPrepareProposalFiltersInvalid(t *testing.T) {
	env := setupMetadataShardTest(t)

	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0x01}, 32)

	validTxBytes, err := proto.Marshal(buildCreateStreamTx(streamID, genesisHash))
	require.NoError(t, err)

	invalidTx := &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				Stream: &prot.StreamMetadata{
					StreamId:          []byte{0x01}, // invalid
					LastMiniblockHash: genesisHash,
					LastMiniblockNum:  0,
					Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
					ReplicationFactor: 1,
				},
			},
		},
	}
	invalidTxBytes, err := proto.Marshal(invalidTx)
	require.NoError(t, err)

	resp, err := env.shard.PrepareProposal(env.ctx, &abci.PrepareProposalRequest{
		Txs:        [][]byte{invalidTxBytes, validTxBytes},
		MaxTxBytes: int64(len(validTxBytes) + len(invalidTxBytes)),
	})
	require.NoError(t, err)
	require.Len(t, resp.Txs, 1)
	require.Equal(t, validTxBytes, resp.Txs[0])
}

func TestMetadataShardFinalizeBlockWithoutCommit(t *testing.T) {
	env := setupMetadataShardTest(t)

	streamID1 := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash1 := bytes.Repeat([]byte{0xaa}, 32)
	createTx1Bytes, err := proto.Marshal(buildCreateStreamTx(streamID1, genesisHash1))
	require.NoError(t, err)

	// First FinalizeBlock at height 1
	resp, err := env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 1,
		Txs:    [][]byte{createTx1Bytes},
	})
	require.NoError(t, err)
	require.Len(t, resp.TxResults, 1)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)

	// Second FinalizeBlock without Commit should fail
	streamID2 := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash2 := bytes.Repeat([]byte{0xbb}, 32)
	createTx2Bytes, err := proto.Marshal(buildCreateStreamTx(streamID2, genesisHash2))
	require.NoError(t, err)

	_, err = env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 2,
		Txs:    [][]byte{createTx2Bytes},
	})
	require.Error(t, err)
	require.True(t, base.IsRiverErrorCode(err, prot.Err_FAILED_PRECONDITION))
	require.Contains(t, err.Error(), "FinalizeBlock called without committing previous block")
}

func TestMetadataShardFinalizeBlockWrongHeight(t *testing.T) {
	env := setupMetadataShardTest(t)

	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)
	createTxBytes, err := proto.Marshal(buildCreateStreamTx(streamID, genesisHash))
	require.NoError(t, err)

	// FinalizeBlock at height 2 when lastBlockHeight is 0 should fail
	_, err = env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 2, // Should be 1
		Txs:    [][]byte{createTxBytes},
	})
	require.Error(t, err)
	require.True(t, base.IsRiverErrorCode(err, prot.Err_FAILED_PRECONDITION))
	require.Contains(t, err.Error(), "height mismatch")
}

func TestMetadataShardCommitWithoutFinalizeBlock(t *testing.T) {
	env := setupMetadataShardTest(t)

	// Commit without FinalizeBlock should fail
	_, err := env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.Error(t, err)
	require.True(t, base.IsRiverErrorCode(err, prot.Err_FAILED_PRECONDITION))
	require.Contains(t, err.Error(), "Commit called without FinalizeBlock")
}

func TestMetadataShardMultipleBlockSequence(t *testing.T) {
	env := setupMetadataShardTest(t)

	// Block 1: Create stream
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)
	createTxBytes, err := proto.Marshal(buildCreateStreamTx(streamID, genesisHash))
	require.NoError(t, err)

	resp, err := env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 1,
		Txs:    [][]byte{createTxBytes},
	})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	// Block 2: Update stream
	hash2 := bytes.Repeat([]byte{0xbb}, 32)
	updateTx1 := &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{{
					StreamId:          streamID[:],
					PrevMiniblockHash: genesisHash,
					LastMiniblockHash: hash2,
					LastMiniblockNum:  1,
				}},
			},
		},
	}
	updateTx1Bytes, err := proto.Marshal(updateTx1)
	require.NoError(t, err)

	resp, err = env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 2,
		Txs:    [][]byte{updateTx1Bytes},
	})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	// Block 3: Another update
	hash3 := bytes.Repeat([]byte{0xcc}, 32)
	updateTx2 := &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{{
					StreamId:          streamID[:],
					PrevMiniblockHash: hash2,
					LastMiniblockHash: hash3,
					LastMiniblockNum:  2,
				}},
			},
		},
	}
	updateTx2Bytes, err := proto.Marshal(updateTx2)
	require.NoError(t, err)

	resp, err = env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 3,
		Txs:    [][]byte{updateTx2Bytes},
	})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	// Verify final state
	info, err := env.shard.Info(env.ctx, &abci.InfoRequest{})
	require.NoError(t, err)
	require.EqualValues(t, 3, info.LastBlockHeight)

	queryResp, err := env.shard.Query(env.ctx, &abci.QueryRequest{Path: "/stream/" + streamID.String()})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, queryResp.Code)

	var metadata prot.StreamMetadata
	require.NoError(t, protojson.Unmarshal(queryResp.Value, &metadata))
	require.Equal(t, hash3, metadata.LastMiniblockHash)
	require.EqualValues(t, 2, metadata.LastMiniblockNum)
}

func TestMetadataShardDuplicateStreamInSameBlock(t *testing.T) {
	env := setupMetadataShardTest(t)

	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)

	// Create same stream twice in same block
	createTx1Bytes, err := proto.Marshal(buildCreateStreamTx(streamID, genesisHash))
	require.NoError(t, err)
	createTx2Bytes, err := proto.Marshal(buildCreateStreamTx(streamID, genesisHash))
	require.NoError(t, err)

	resp, err := env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 1,
		Txs:    [][]byte{createTx1Bytes, createTx2Bytes},
	})
	require.NoError(t, err)
	require.Len(t, resp.TxResults, 2)

	// First create should succeed
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)

	// Second create should fail with ALREADY_EXISTS
	require.NotEqual(t, abci.CodeTypeOK, resp.TxResults[1].Code)
	require.Equal(t, uint32(prot.Err_ALREADY_EXISTS), resp.TxResults[1].Code)
}

func TestMetadataShardUpdateNonExistentStream(t *testing.T) {
	env := setupMetadataShardTest(t)

	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)
	updatedHash := bytes.Repeat([]byte{0xbb}, 32)

	// Try to update a stream that doesn't exist
	updateTx := &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{{
					StreamId:          streamID[:],
					PrevMiniblockHash: genesisHash,
					LastMiniblockHash: updatedHash,
					LastMiniblockNum:  1,
				}},
			},
		},
	}
	updateTxBytes, err := proto.Marshal(updateTx)
	require.NoError(t, err)

	resp, err := env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 1,
		Txs:    [][]byte{updateTxBytes},
	})
	require.NoError(t, err)
	require.Len(t, resp.TxResults, 1)

	// Batch updates report errors through events, tx code is OK
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)
	// Should have error event with NOT_FOUND
	require.Len(t, resp.TxResults[0].Events, 1)
	require.Equal(t, "mberr", resp.TxResults[0].Events[0].Type, "should have error event")
}

func TestMetadataShardMultipleUpdatesInSameBlock(t *testing.T) {
	env := setupMetadataShardTest(t)

	// Create two different streams
	streamID1 := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID2 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
	genesisHash1 := bytes.Repeat([]byte{0xaa}, 32)
	genesisHash2 := bytes.Repeat([]byte{0xbb}, 32)

	createTx1Bytes, err := proto.Marshal(buildCreateStreamTx(streamID1, genesisHash1))
	require.NoError(t, err)
	createTx2Bytes, err := proto.Marshal(buildCreateStreamTx(streamID2, genesisHash2))
	require.NoError(t, err)

	// Block 1: Create both streams
	resp, err := env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 1,
		Txs:    [][]byte{createTx1Bytes, createTx2Bytes},
	})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[1].Code)

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	// Block 2: Update both streams in a batch
	hash1Updated := bytes.Repeat([]byte{0xcc}, 32)
	hash2Updated := bytes.Repeat([]byte{0xdd}, 32)

	batchUpdateTx := &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{
					{
						StreamId:          streamID1[:],
						PrevMiniblockHash: genesisHash1,
						LastMiniblockHash: hash1Updated,
						LastMiniblockNum:  1,
					},
					{
						StreamId:          streamID2[:],
						PrevMiniblockHash: genesisHash2,
						LastMiniblockHash: hash2Updated,
						LastMiniblockNum:  1,
					},
				},
			},
		},
	}
	batchUpdateTxBytes, err := proto.Marshal(batchUpdateTx)
	require.NoError(t, err)

	resp, err = env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 2,
		Txs:    [][]byte{batchUpdateTxBytes},
	})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)
	// Verify both updates have "mbok" events
	require.Len(t, resp.TxResults[0].Events, 2)
	require.Equal(t, "mbok", resp.TxResults[0].Events[0].Type, "first update should have mbok event")
	require.Equal(t, "mbok", resp.TxResults[0].Events[1].Type, "second update should have mbok event")

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	// Verify both streams were updated
	queryResp1, err := env.shard.Query(env.ctx, &abci.QueryRequest{Path: "/stream/" + streamID1.String()})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, queryResp1.Code)

	var metadata1 prot.StreamMetadata
	require.NoError(t, protojson.Unmarshal(queryResp1.Value, &metadata1))
	require.Equal(t, hash1Updated, metadata1.LastMiniblockHash)

	queryResp2, err := env.shard.Query(env.ctx, &abci.QueryRequest{Path: "/stream/" + streamID2.String()})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, queryResp2.Code)

	var metadata2 prot.StreamMetadata
	require.NoError(t, protojson.Unmarshal(queryResp2.Value, &metadata2))
	require.Equal(t, hash2Updated, metadata2.LastMiniblockHash)
}

func TestMetadataShardConsecutiveUpdatesToSameStreamInSameBlock(t *testing.T) {
	env := setupMetadataShardTest(t)

	// Create a stream
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)
	hash1 := bytes.Repeat([]byte{0xbb}, 32)
	hash2 := bytes.Repeat([]byte{0xcc}, 32)

	// Block 1: Create the stream
	createTxBytes, err := proto.Marshal(buildCreateStreamTx(streamID, genesisHash))
	require.NoError(t, err)

	resp, err := env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 1,
		Txs:    [][]byte{createTxBytes},
	})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code, "create should succeed")

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	// Block 2: Two consecutive updates to the same stream - second should fail
	update1Tx := &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{{
					StreamId:          streamID[:],
					PrevMiniblockHash: genesisHash,
					LastMiniblockHash: hash1,
					LastMiniblockNum:  1,
				}},
			},
		},
	}
	update1TxBytes, err := proto.Marshal(update1Tx)
	require.NoError(t, err)

	update2Tx := &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{{
					StreamId:          streamID[:],
					PrevMiniblockHash: hash1, // References the first update
					LastMiniblockHash: hash2,
					LastMiniblockNum:  2,
				}},
			},
		},
	}
	update2TxBytes, err := proto.Marshal(update2Tx)
	require.NoError(t, err)

	resp, err = env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 2,
		Txs:    [][]byte{update1TxBytes, update2TxBytes},
	})
	require.NoError(t, err)
	require.Len(t, resp.TxResults, 2)

	// Batch updates report status through events, tx code is OK
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code, "update1 tx code should be OK")
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[1].Code, "update2 tx code should be OK")
	// First update should succeed with "mbok" event
	require.Len(t, resp.TxResults[0].Events, 1)
	require.Equal(t, "mbok", resp.TxResults[0].Events[0].Type, "update1 should have mbok event")
	// Second update should fail because it updates the same stream twice in same block
	require.Len(t, resp.TxResults[1].Events, 1)
	require.Equal(t, "mberr", resp.TxResults[1].Events[0].Type, "update2 should have mberr event")

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	// Verify final state - only first update should be applied
	queryResp, err := env.shard.Query(env.ctx, &abci.QueryRequest{Path: "/stream/" + streamID.String()})
	require.NoError(t, err)
	require.Equal(t, abci.CodeTypeOK, queryResp.Code)

	var metadata prot.StreamMetadata
	require.NoError(t, protojson.Unmarshal(queryResp.Value, &metadata))
	require.Equal(t, hash1, metadata.LastMiniblockHash)
	require.EqualValues(t, 1, metadata.LastMiniblockNum)
}
