package metadata

import (
	"bytes"
	"context"
	"strings"
	"testing"
	"time"

	abci "github.com/cometbft/cometbft/abci/types"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	prot "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

type metadataTestEnv struct {
	shard *MetadataShard
	store *storage.PostgresMetadataShardStore
	ctx   context.Context
}

func setupMetadataShardTest(t *testing.T) metadataTestEnv {
	t.Helper()
	ctx := test.NewTestContext(t)

	dbCfg, dbSchema, dbCloser, err := dbtestutils.ConfigureDB(ctx)
	require.NoError(t, err)

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	poolInfo, err := storage.CreateAndValidatePgxPool(ctx, dbCfg, dbSchema, nil)
	require.NoError(t, err)

	exitSignal := make(chan error, 1)
	streamStore, err := storage.NewPostgresStreamStore(
		ctx,
		poolInfo,
		base.GenShortNanoid(),
		exitSignal,
		infra.NewMetricsFactory(nil, "", ""),
		&mocks.MockOnChainCfg{
			Settings: &crypto.OnChainSettings{
				StreamEphemeralStreamTTL: time.Minute * 10,
				StreamHistoryMiniblocks: crypto.StreamHistoryMiniblocks{
					Default:      0,
					Space:        5,
					UserSettings: 5,
				},
				MinSnapshotEvents: crypto.MinSnapshotEventsSettings{
					Default: 10,
				},
				StreamSnapshotIntervalInMiniblocks: 110,
				StreamTrimActivationFactor:         1,
			},
		},
		nil,
		5,
	)
	require.NoError(t, err)

	store, err := storage.NewPostgresMetadataShardStore(ctx, &streamStore.PostgresEventStore, 1)
	require.NoError(t, err)

	shard := &MetadataShard{
		opts: MetadataShardOpts{
			ShardID: 1,
			Store:   store,
		},
		chainID: chainIDForShard(1),
		store:   store,
		log:     logging.FromCtx(ctx),
	}

	t.Cleanup(func() {
		streamStore.Close(ctx)
		dbCloser()
	})

	return metadataTestEnv{
		shard: shard,
		store: store,
		ctx:   ctx,
	}
}

func buildCreateStreamTx(streamID shared.StreamId, genesisHash []byte) *prot.MetadataTx {
	return &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				StreamId:             streamID[:],
				GenesisMiniblockHash: genesisHash,
				GenesisMiniblock:     []byte("genesis"),
				Nodes:                [][]byte{bytes.Repeat([]byte{0x01}, 20)},
				Flags:                0,
				ReplicationFactor:    1,
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
				StreamId:          []byte{0x01, 0x02}, // invalid length
				GenesisMiniblock:  []byte("genesis"),
				Nodes:             [][]byte{bytes.Repeat([]byte{0x01}, 20)},
				ReplicationFactor: 1,
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
	createTxBytes, err := proto.Marshal(buildCreateStreamTx(streamID, genesisHash))
	require.NoError(t, err)

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

	resp, err := env.shard.FinalizeBlock(env.ctx, &abci.FinalizeBlockRequest{
		Height: 1,
		Txs:    [][]byte{createTxBytes, updateTxBytes},
	})
	require.NoError(t, err)
	require.Len(t, resp.TxResults, 2)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[0].Code)
	require.Equal(t, abci.CodeTypeOK, resp.TxResults[1].Code)

	_, err = env.shard.Commit(env.ctx, &abci.CommitRequest{})
	require.NoError(t, err)

	info, err := env.shard.Info(env.ctx, &abci.InfoRequest{})
	require.NoError(t, err)
	require.EqualValues(t, 1, info.LastBlockHeight)
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
				StreamId:             []byte{0x01}, // invalid
				GenesisMiniblockHash: genesisHash,
				GenesisMiniblock:     []byte("genesis"),
				Nodes:                [][]byte{bytes.Repeat([]byte{0x01}, 20)},
				ReplicationFactor:    1,
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
