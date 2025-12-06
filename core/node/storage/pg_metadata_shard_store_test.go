package storage

import (
	"bytes"
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/base"
	prot "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func setupMetadataShardStoreTest(t *testing.T) (*PostgresMetadataShardStore, context.Context) {
	t.Helper()
	params := setupStreamStorageTest(t)

	store, err := NewPostgresMetadataShardStore(
		params.ctx,
		&params.pgStreamStore.PostgresEventStore,
		1,
	)
	require.NoError(t, err)

	return store, params.ctx
}

func TestMetadataShardCreateAndGetStream(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)
	genesisMiniblock := []byte("genesis")
	nodes := [][]byte{
		bytes.Repeat([]byte{0x10}, 20),
		bytes.Repeat([]byte{0x11}, 20),
		bytes.Repeat([]byte{0x12}, 20),
	}

	record, err := store.CreateStream(ctx, shardID, 1, &prot.CreateStreamTx{
		StreamId:             streamID,
		GenesisMiniblockHash: genesisHash,
		GenesisMiniblock:     genesisMiniblock,
		Nodes:                nodes,
		ReplicationFactor:    2,
		Sealed:               false,
	})
	require.NoError(t, err)
	require.Equal(t, streamID, record.StreamId)
	require.EqualValues(t, genesisHash, record.LastMiniblockHash)
	require.EqualValues(t, 0, record.LastMiniblockNum)
	require.Len(t, record.Nodes, len(nodes))

	fetched, err := store.GetStream(ctx, shardID, streamId)
	require.NoError(t, err)
	require.Equal(t, record.StreamId, fetched.StreamId)
	require.EqualValues(t, record.Nodes, fetched.Nodes)
	require.Equal(t, record.ReplicationFactor, fetched.ReplicationFactor)
}

func TestMetadataShardCreateDuplicate(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xbb}, 32)
	genesisMiniblock := []byte("genesis")

	_, err := store.CreateStream(ctx, shardID, 1, &prot.CreateStreamTx{
		StreamId:             streamID,
		GenesisMiniblockHash: genesisHash,
		GenesisMiniblock:     genesisMiniblock,
		Nodes:                [][]byte{bytes.Repeat([]byte{0x01}, 20)},
		ReplicationFactor:    1,
	})
	require.NoError(t, err)

	_, err = store.CreateStream(ctx, shardID, 2, &prot.CreateStreamTx{
		StreamId:             streamID,
		GenesisMiniblockHash: genesisHash,
		GenesisMiniblock:     genesisMiniblock,
		Nodes:                [][]byte{bytes.Repeat([]byte{0x01}, 20)},
		ReplicationFactor:    1,
	})
	require.Error(t, err)
	require.Equal(t, prot.Err_ALREADY_EXISTS, base.AsRiverError(err).Code)
}

func TestMetadataShardApplyMiniblockBatch(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1
	var err error

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xcc}, 32)
	genesisMiniblock := []byte("genesis")

	_, err = store.CreateStream(ctx, shardID, 1, &prot.CreateStreamTx{
		StreamId:             streamID,
		GenesisMiniblockHash: genesisHash,
		GenesisMiniblock:     genesisMiniblock,
		Nodes:                [][]byte{bytes.Repeat([]byte{0x01}, 20)},
		ReplicationFactor:    1,
	})
	require.NoError(t, err)

	newHash := bytes.Repeat([]byte{0xdd}, 32)
	err = store.ApplyMiniblockBatch(ctx, shardID, 2, []*prot.MiniblockUpdate{{
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

	// Skipping miniblock height should fail.
	err = store.ApplyMiniblockBatch(ctx, shardID, 3, []*prot.MiniblockUpdate{{
		StreamId:          streamID,
		PrevMiniblockHash: newHash,
		LastMiniblockHash: bytes.Repeat([]byte{0xef}, 32),
		LastMiniblockNum:  3,
	}})
	require.Error(t, err)
	require.Equal(t, prot.Err_FAILED_PRECONDITION, base.AsRiverError(err).Code)

	// Prev hash mismatch should fail.
	err = store.ApplyMiniblockBatch(ctx, shardID, 4, []*prot.MiniblockUpdate{{
		StreamId:          streamID,
		PrevMiniblockHash: genesisHash, // stale
		LastMiniblockHash: bytes.Repeat([]byte{0xee}, 32),
		LastMiniblockNum:  2,
	}})
	require.Error(t, err)
	require.Equal(t, prot.Err_FAILED_PRECONDITION, base.AsRiverError(err).Code)
}

func TestMetadataShardUpdateNodesAndReplication(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1
	var err error

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)
	genesisMiniblock := []byte("genesis")

	_, err = store.CreateStream(ctx, shardID, 1, &prot.CreateStreamTx{
		StreamId:             streamID,
		GenesisMiniblockHash: genesisHash,
		GenesisMiniblock:     genesisMiniblock,
		Nodes:                [][]byte{bytes.Repeat([]byte{0x01}, 20)},
		ReplicationFactor:    1,
	})
	require.NoError(t, err)

	updated, err := store.UpdateStreamNodesAndReplication(ctx, shardID, 5, &prot.UpdateStreamNodesAndReplicationTx{
		StreamId: streamID,
		Nodes: [][]byte{
			bytes.Repeat([]byte{0x02}, 20),
			bytes.Repeat([]byte{0x03}, 20),
		},
		ReplicationFactor: 2,
	})
	require.NoError(t, err)
	require.EqualValues(t, 2, updated.ReplicationFactor)
	require.Equal(t, 2, len(updated.Nodes))
	require.Equal(t, bytes.Repeat([]byte{0x02}, 20), updated.Nodes[0])
	require.Equal(t, bytes.Repeat([]byte{0x03}, 20), updated.Nodes[1])
}

func TestMetadataShardCreateStreamPreservesNodeOrder(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xba}, 32)
	genesisMiniblock := []byte("genesis")

	nodes := [][]byte{
		bytes.Repeat([]byte{0x10}, 20),
		bytes.Repeat([]byte{0x02}, 20),
		bytes.Repeat([]byte{0xff}, 20),
	}

	_, err := store.CreateStream(ctx, shardID, 1, &prot.CreateStreamTx{
		StreamId:             streamID,
		GenesisMiniblockHash: genesisHash,
		GenesisMiniblock:     genesisMiniblock,
		Nodes:                nodes,
		ReplicationFactor:    3,
	})
	require.NoError(t, err)

	record, err := store.GetStream(ctx, shardID, streamId)
	require.NoError(t, err)
	require.Equal(t, nodes, record.Nodes, "node order should be preserved")
}

func TestMetadataShardListAndCount(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1
	var err error

	for i := 0; i < 3; i++ {
		id := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hash := bytes.Repeat([]byte{byte(0x90 + i)}, 32)
		_, err = store.CreateStream(ctx, shardID, int64(i+1), &prot.CreateStreamTx{
			StreamId:             id[:],
			GenesisMiniblockHash: hash,
			GenesisMiniblock:     []byte("genesis"),
			Nodes:                [][]byte{bytes.Repeat([]byte{0x01}, 20), bytes.Repeat([]byte{byte(0x20 + i)}, 20)},
			ReplicationFactor:    2,
		})
		require.NoError(t, err)
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

func TestMetadataShardSealedNodeChangeRejected(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1
	var err error

	streamId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamID := streamId[:]
	genesisHash := bytes.Repeat([]byte{0xab}, 32)
	genesisMiniblock := []byte("genesis")

	_, err = store.CreateStream(ctx, shardID, 1, &prot.CreateStreamTx{
		StreamId:             streamID,
		GenesisMiniblockHash: genesisHash,
		GenesisMiniblock:     genesisMiniblock,
		Nodes:                [][]byte{bytes.Repeat([]byte{0x01}, 20)},
		ReplicationFactor:    1,
		Sealed:               true,
	})
	require.NoError(t, err)

	_, err = store.UpdateStreamNodesAndReplication(ctx, shardID, 2, &prot.UpdateStreamNodesAndReplicationTx{
		StreamId: streamID,
		Nodes:    [][]byte{bytes.Repeat([]byte{0x02}, 20)},
	})
	require.Error(t, err)
	require.Equal(t, prot.Err_FAILED_PRECONDITION, base.AsRiverError(err).Code)
}

func TestMetadataShardCountsAndState(t *testing.T) {
	store, ctx := setupMetadataShardStoreTest(t)
	const shardID = 1

	streamA := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamB := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	nodeA := common.BytesToAddress(bytes.Repeat([]byte{0xaa}, 20))
	nodeB := common.BytesToAddress(bytes.Repeat([]byte{0xbb}, 20))

	_, err := store.CreateStream(ctx, shardID, 1, &prot.CreateStreamTx{
		StreamId:             streamA[:],
		GenesisMiniblockHash: bytes.Repeat([]byte{0x01}, 32),
		GenesisMiniblock:     []byte("genesis"),
		Nodes:                [][]byte{nodeA.Bytes(), nodeB.Bytes()},
		ReplicationFactor:    2,
	})
	require.NoError(t, err)

	_, err = store.CreateStream(ctx, shardID, 2, &prot.CreateStreamTx{
		StreamId:             streamB[:],
		GenesisMiniblockHash: bytes.Repeat([]byte{0x02}, 32),
		GenesisMiniblock:     []byte("genesis"),
		Nodes:                [][]byte{nodeB.Bytes()},
		ReplicationFactor:    1,
	})
	require.NoError(t, err)

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
	require.EqualValues(t, 0, state.LastHeight)

	err = store.SetShardState(ctx, shardID, 10, []byte{0x01, 0x02})
	require.NoError(t, err)
	state, err = store.GetShardState(ctx, shardID)
	require.NoError(t, err)
	require.EqualValues(t, 10, state.LastHeight)
	require.Equal(t, []byte{0x01, 0x02}, state.LastAppHash)
}
