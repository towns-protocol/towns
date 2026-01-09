package storage

import (
	"bytes"
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/infra"
	protocol "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
)

type testMetadataServiceStoreParams struct {
	ctx        context.Context
	store      *PostgresMetadataServiceStore
	schema     string
	config     *config.DatabaseConfig
	exitSignal chan error
}

func setupMetadataServiceStoreTest(t *testing.T) *testMetadataServiceStoreParams {
	t.Helper()
	require := require.New(t)
	ctx := test.NewTestContext(t)

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDbWithPrefix(ctx, "md_")
	require.NoError(err, "Error configuring db for test")

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(err, "Error creating pgx pool for test")

	exitSignal := make(chan error, 1)
	store, err := NewPostgresMetadataServiceStore(
		ctx,
		pool,
		exitSignal,
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(err, "Error creating metadata service store")

	params := &testMetadataServiceStoreParams{
		ctx:        ctx,
		store:      store,
		schema:     dbSchemaName,
		config:     dbCfg,
		exitSignal: exitSignal,
	}

	t.Cleanup(func() {
		store.Close(ctx)
		dbCloser()
	})

	return params
}

func makeHash(seed byte) []byte {
	return bytes.Repeat([]byte{seed}, 32)
}

func TestMetadataServiceStore_ListGetCounts(t *testing.T) {
	params := setupMetadataServiceStoreTest(t)
	require := require.New(t)
	store := params.store
	ctx := params.ctx

	lastBlock, err := store.GetLastRecordBlockNum(ctx)
	require.NoError(err)
	require.EqualValues(-1, lastBlock)

	stream1 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
	stream2 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
	stream3 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

	updates := []*MetadataStreamRecordUpdate{
		{
			Insert: &InsertMetadataStreamRecord{
				StreamId:          stream1,
				LastMiniblockHash: makeHash(0x01),
				LastMiniblockNum:  0,
				NodeIndexes:       []int32{1, 2},
				ReplicationFactor: 2,
			},
		},
		{
			Insert: &InsertMetadataStreamRecord{
				StreamId:          stream2,
				LastMiniblockHash: makeHash(0x02),
				LastMiniblockNum:  0,
				NodeIndexes:       []int32{2, 3},
				ReplicationFactor: 2,
			},
		},
		{
			Insert: &InsertMetadataStreamRecord{
				StreamId:          stream3,
				LastMiniblockHash: makeHash(0x03),
				LastMiniblockNum:  0,
				NodeIndexes:       []int32{3, 4},
				ReplicationFactor: 2,
			},
		},
	}

	blockNum, errs, err := store.BatchUpdateStreamRecords(ctx, updates, 10)
	require.NoError(err)
	require.EqualValues(0, blockNum)
	require.Len(errs, len(updates))
	for _, err := range errs {
		require.NoError(err)
	}

	lastBlock, err = store.GetLastRecordBlockNum(ctx)
	require.NoError(err)
	require.EqualValues(blockNum, lastBlock)

	var listed []shared.StreamId
	pageCalls := 0
	lastBlock, err = store.ListStreamRecords(ctx, 2, func(records []*MetadataStreamRecord) error {
		pageCalls++
		for _, record := range records {
			listed = append(listed, record.StreamId)
		}
		return nil
	})
	require.NoError(err)
	require.EqualValues(blockNum, lastBlock)
	require.Equal(2, pageCalls)
	require.Len(listed, 3)
	for i := 1; i < len(listed); i++ {
		require.True(bytes.Compare(listed[i-1][:], listed[i][:]) < 0)
	}

	var nodeListed []shared.StreamId
	nodeCalls := 0
	lastBlock, err = store.ListStreamRecordsForNode(ctx, 2, 1, func(records []*MetadataStreamRecord) error {
		nodeCalls++
		for _, record := range records {
			nodeListed = append(nodeListed, record.StreamId)
		}
		return nil
	})
	require.NoError(err)
	require.EqualValues(blockNum, lastBlock)
	require.Equal(2, nodeCalls)
	require.ElementsMatch([]shared.StreamId{stream1, stream2}, nodeListed)

	record, err := store.GetStreamRecord(ctx, stream1)
	require.NoError(err)
	require.Equal(stream1, record.StreamId)
	require.Equal([]int32{1, 2}, record.NodeIndexes)
	require.EqualValues(2, record.ReplicationFactor)
	require.EqualValues(0, record.LastMiniblockNum)
	require.Equal(makeHash(0x01), record.LastMiniblockHash)
	require.False(record.Sealed)
	require.EqualValues(blockNum, record.CreatedAtBlock)
	require.EqualValues(blockNum, record.UpdatedAtBlock)

	count, err := store.GetStreamRecordCount(ctx)
	require.NoError(err)
	require.EqualValues(3, count)

	count, err = store.GetStreamRecordCountOnNode(ctx, 3)
	require.NoError(err)
	require.EqualValues(2, count)

	blocks, err := store.GetRecordBlocks(ctx, 0, 1)
	require.NoError(err)
	require.Len(blocks, 3)

	expectedMask := StreamRecordEventMaskLastMiniblockHash |
		StreamRecordEventMaskLastMiniblockNum |
		StreamRecordEventMaskNodes |
		StreamRecordEventMaskReplicationFactor |
		StreamRecordEventMaskSealed

	expectedByStream := map[shared.StreamId][]byte{
		stream1: makeHash(0x01),
		stream2: makeHash(0x02),
		stream3: makeHash(0x03),
	}

	for i, block := range blocks {
		require.EqualValues(0, block.BlockNum)
		require.EqualValues(i, block.BlockSlot)
		require.Equal(expectedMask, block.EventMask)
		require.NotNil(block.Record)
		require.Equal(expectedByStream[block.Record.StreamId], block.Record.LastMiniblockHash)
	}
}

func TestMetadataServiceStore_BatchUpdateErrorsAndBlocks(t *testing.T) {
	params := setupMetadataServiceStoreTest(t)
	require := require.New(t)
	store := params.store
	ctx := params.ctx

	stream1 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
	stream2 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

	initial := []*MetadataStreamRecordUpdate{
		{
			Insert: &InsertMetadataStreamRecord{
				StreamId:          stream1,
				LastMiniblockHash: makeHash(0x10),
				LastMiniblockNum:  0,
				NodeIndexes:       []int32{1, 2},
				ReplicationFactor: 2,
			},
		},
		{
			Insert: &InsertMetadataStreamRecord{
				StreamId:          stream2,
				LastMiniblockHash: makeHash(0x20),
				LastMiniblockNum:  0,
				NodeIndexes:       []int32{2, 3},
				ReplicationFactor: 2,
			},
		},
	}

	blockNum, errs, err := store.BatchUpdateStreamRecords(ctx, initial, 10)
	require.NoError(err)
	require.EqualValues(0, blockNum)
	for _, err := range errs {
		require.NoError(err)
	}

	lastBlock, err := store.GetLastRecordBlockNum(ctx)
	require.NoError(err)
	require.EqualValues(blockNum, lastBlock)

	updates := []*MetadataStreamRecordUpdate{
		{
			Placement: &UpdateMetadataStreamPlacement{
				StreamId:          stream1,
				NodeIndexes:       []int32{2, 3},
				ReplicationFactor: 2,
			},
		},
		{
			Miniblock: &UpdateMetadataStreamMiniblock{
				StreamId:          stream1,
				PrevMiniblockHash: makeHash(0x10),
				LastMiniblockHash: makeHash(0x11),
				LastMiniblockNum:  1,
				Sealed:            true,
			},
		},
		{
			Miniblock: &UpdateMetadataStreamMiniblock{
				StreamId:          stream2,
				PrevMiniblockHash: makeHash(0xff),
				LastMiniblockHash: makeHash(0x21),
				LastMiniblockNum:  1,
			},
		},
	}

	blockNum, errs, err = store.BatchUpdateStreamRecords(ctx, updates, 10)
	require.NoError(err)
	require.EqualValues(1, blockNum)
	require.Len(errs, len(updates))
	require.NoError(errs[0])
	require.NoError(errs[1])
	require.Error(errs[2])
	require.Equal(protocol.Err_BAD_PREV_MINIBLOCK_HASH, base.AsRiverError(errs[2]).Code)

	lastBlock, err = store.GetLastRecordBlockNum(ctx)
	require.NoError(err)
	require.EqualValues(blockNum, lastBlock)

	record, err := store.GetStreamRecord(ctx, stream1)
	require.NoError(err)
	require.Equal([]int32{2, 3}, record.NodeIndexes)
	require.EqualValues(2, record.ReplicationFactor)
	require.Equal(makeHash(0x11), record.LastMiniblockHash)
	require.EqualValues(1, record.LastMiniblockNum)
	require.True(record.Sealed)
	require.EqualValues(blockNum, record.UpdatedAtBlock)

	record, err = store.GetStreamRecord(ctx, stream2)
	require.NoError(err)
	require.Equal([]int32{2, 3}, record.NodeIndexes)
	require.Equal(makeHash(0x20), record.LastMiniblockHash)
	require.EqualValues(0, record.LastMiniblockNum)
	require.False(record.Sealed)

	count, err := store.GetStreamRecordCountOnNode(ctx, 1)
	require.NoError(err)
	require.EqualValues(0, count)

	nodeCalls := 0
	lastBlock, err = store.ListStreamRecordsForNode(ctx, 1, 10, func(records []*MetadataStreamRecord) error {
		nodeCalls++
		return nil
	})
	require.NoError(err)
	require.EqualValues(blockNum, lastBlock)
	require.Equal(0, nodeCalls)

	blocks, err := store.GetRecordBlocks(ctx, 1, 2)
	require.NoError(err)
	require.Len(blocks, 2)
	require.EqualValues(0, blocks[0].BlockSlot)
	require.EqualValues(1, blocks[1].BlockSlot)

	require.Equal(
		StreamRecordEventMaskNodes|StreamRecordEventMaskReplicationFactor,
		blocks[0].EventMask,
	)
	require.Equal(
		StreamRecordEventMaskLastMiniblockHash|StreamRecordEventMaskLastMiniblockNum|StreamRecordEventMaskSealed,
		blocks[1].EventMask,
	)
}

func TestMetadataServiceStore_BatchUpdateTrimsBlocks(t *testing.T) {
	params := setupMetadataServiceStoreTest(t)
	require := require.New(t)
	store := params.store
	ctx := params.ctx

	stream1 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

	blockNum, errs, err := store.BatchUpdateStreamRecords(ctx, []*MetadataStreamRecordUpdate{
		{
			Insert: &InsertMetadataStreamRecord{
				StreamId:          stream1,
				LastMiniblockHash: makeHash(0x01),
				LastMiniblockNum:  0,
				NodeIndexes:       []int32{1, 2},
				ReplicationFactor: 2,
			},
		},
	}, 2)
	require.NoError(err)
	require.EqualValues(0, blockNum)
	require.Len(errs, 1)
	require.NoError(errs[0])

	blockNum, errs, err = store.BatchUpdateStreamRecords(ctx, []*MetadataStreamRecordUpdate{
		{
			Miniblock: &UpdateMetadataStreamMiniblock{
				StreamId:          stream1,
				PrevMiniblockHash: makeHash(0x01),
				LastMiniblockHash: makeHash(0x02),
				LastMiniblockNum:  1,
			},
		},
	}, 2)
	require.NoError(err)
	require.EqualValues(1, blockNum)
	require.Len(errs, 1)
	require.NoError(errs[0])

	blockNum, errs, err = store.BatchUpdateStreamRecords(ctx, []*MetadataStreamRecordUpdate{
		{
			Placement: &UpdateMetadataStreamPlacement{
				StreamId:          stream1,
				NodeIndexes:       []int32{2, 3},
				ReplicationFactor: 2,
			},
		},
	}, 2)
	require.NoError(err)
	require.EqualValues(2, blockNum)
	require.Len(errs, 1)
	require.NoError(errs[0])

	blocks, err := store.GetRecordBlocks(ctx, 0, 10)
	require.NoError(err)

	blockNums := make(map[int64]struct{})
	for _, block := range blocks {
		blockNums[block.BlockNum] = struct{}{}
	}
	require.Len(blockNums, 2)
	_, hasBlock0 := blockNums[0]
	require.False(hasBlock0)
	_, hasBlock1 := blockNums[1]
	require.True(hasBlock1)
	_, hasBlock2 := blockNums[2]
	require.True(hasBlock2)
}

func TestMetadataServiceStore_BatchUpdateNoTrimWhenZero(t *testing.T) {
	params := setupMetadataServiceStoreTest(t)
	require := require.New(t)
	store := params.store
	ctx := params.ctx

	stream1 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

	blockNum, errs, err := store.BatchUpdateStreamRecords(ctx, []*MetadataStreamRecordUpdate{
		{
			Insert: &InsertMetadataStreamRecord{
				StreamId:          stream1,
				LastMiniblockHash: makeHash(0x01),
				LastMiniblockNum:  0,
				NodeIndexes:       []int32{1, 2},
				ReplicationFactor: 2,
			},
		},
	}, 0)
	require.NoError(err)
	require.EqualValues(0, blockNum)
	require.Len(errs, 1)
	require.NoError(errs[0])

	blockNum, errs, err = store.BatchUpdateStreamRecords(ctx, []*MetadataStreamRecordUpdate{
		{
			Miniblock: &UpdateMetadataStreamMiniblock{
				StreamId:          stream1,
				PrevMiniblockHash: makeHash(0x01),
				LastMiniblockHash: makeHash(0x02),
				LastMiniblockNum:  1,
			},
		},
	}, 0)
	require.NoError(err)
	require.EqualValues(1, blockNum)
	require.Len(errs, 1)
	require.NoError(errs[0])

	blockNum, errs, err = store.BatchUpdateStreamRecords(ctx, []*MetadataStreamRecordUpdate{
		{
			Placement: &UpdateMetadataStreamPlacement{
				StreamId:          stream1,
				NodeIndexes:       []int32{2, 3},
				ReplicationFactor: 2,
			},
		},
	}, 0)
	require.NoError(err)
	require.EqualValues(2, blockNum)
	require.Len(errs, 1)
	require.NoError(errs[0])

	blocks, err := store.GetRecordBlocks(ctx, 0, 10)
	require.NoError(err)

	blockNums := make(map[int64]struct{})
	for _, block := range blocks {
		blockNums[block.BlockNum] = struct{}{}
	}
	require.Len(blockNums, 3)
	_, hasBlock0 := blockNums[0]
	require.True(hasBlock0)
	_, hasBlock1 := blockNums[1]
	require.True(hasBlock1)
	_, hasBlock2 := blockNums[2]
	require.True(hasBlock2)
}

func TestMetadataServiceStore_GetRecordBlocksValidation(t *testing.T) {
	params := setupMetadataServiceStoreTest(t)
	require := require.New(t)
	store := params.store
	ctx := params.ctx

	_, err := store.GetRecordBlocks(ctx, -1, 1)
	require.Error(err)

	_, err = store.GetRecordBlocks(ctx, 2, 1)
	require.Error(err)
}

func TestMetadataServiceStore_OnNewRecordBlock(t *testing.T) {
	params := setupMetadataServiceStoreTest(t)
	require := require.New(t)
	store := params.store

	ctx, cancel := context.WithCancel(params.ctx)
	defer cancel()

	updates, errs := store.OnNewRecordBlock(ctx, 2*time.Second)

	time.Sleep(50 * time.Millisecond)

	streamId := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
	blockNum, errsSlice, err := store.BatchUpdateStreamRecords(ctx, []*MetadataStreamRecordUpdate{
		{
			Insert: &InsertMetadataStreamRecord{
				StreamId:          streamId,
				LastMiniblockHash: makeHash(0x55),
				LastMiniblockNum:  0,
				NodeIndexes:       []int32{1, 2},
				ReplicationFactor: 2,
			},
		},
	}, 10)
	require.NoError(err)
	require.Len(errsSlice, 1)
	require.NoError(errsSlice[0])

	select {
	case recvErr, ok := <-errs:
		require.True(ok, "errs channel closed unexpectedly")
		require.NoError(recvErr)
	case got, ok := <-updates:
		require.True(ok, "updates channel closed unexpectedly")
		require.Equal(blockNum, got)
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for record block notification")
	}

	cancel()

	select {
	case _, ok := <-updates:
		require.False(ok)
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for updates channel to close")
	}

	select {
	case _, ok := <-errs:
		require.False(ok)
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for errs channel to close")
	}
}
