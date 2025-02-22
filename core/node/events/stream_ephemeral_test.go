package events

import (
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/mock"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
)

func Test_StreamCache_normalizeEphemeralStream(t *testing.T) {
	ctx, tc := makeCacheTestContext(t, testParams{replFactor: 5, numInstances: 5})
	tc.initAllCaches(&MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	nodes := make([]common.Address, len(tc.instances))
	for i, inst := range tc.instances {
		nodes[i] = inst.params.Wallet.Address
	}
	leaderInstance := tc.instances[0]

	const chunks = 10
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	t.Run("normalize ephemeral stream - all miniblocks exist", func(t *testing.T) {
		streamId, err := StreamIdFromString(STREAM_MEDIA_PREFIX + strings.Repeat("1", 62))
		tc.require.NoError(err)

		mb := MakeGenesisMiniblockForMediaStream(
			tc.t,
			tc.clientWallet,
			leaderInstance.params.Wallet,
			&MediaPayload_Inception{StreamId: streamId[:], ChannelId: channelId[:], ChunkCount: chunks},
		)
		mbBytes, err := mb.ToBytes()
		tc.require.NoError(err)

		err = leaderInstance.params.Storage.CreateEphemeralStreamStorage(ctx, streamId, mbBytes)
		tc.require.NoError(err)

		mbRef := *mb.Ref
		mediaChunks := make([][]byte, chunks)
		for i := 0; i < chunks; i++ {
			// Create media chunk event
			mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
			mp := Make_MediaPayload_Chunk(mediaChunks[i], int32(i))
			envelope, err := MakeEnvelopeWithPayload(leaderInstance.params.Wallet, mp, &mbRef)
			tc.require.NoError(err)

			header, err := MakeEnvelopeWithPayload(leaderInstance.params.Wallet, Make_MiniblockHeader(&MiniblockHeader{
				MiniblockNum:      mbRef.Num + 1,
				PrevMiniblockHash: mbRef.Hash[:],
				EventHashes:       [][]byte{envelope.Hash},
			}), &mbRef)
			tc.require.NoError(err)

			mbBytes, err := proto.Marshal(&Miniblock{
				Events: []*Envelope{envelope},
				Header: header,
			})
			tc.require.NoError(err)

			err = leaderInstance.params.Storage.WriteEphemeralMiniblock(ctx, streamId, &storage.WriteMiniblockData{
				Number: mbRef.Num + 1,
				Hash:   common.BytesToHash(header.Hash),
				Data:   mbBytes,
			})
			tc.require.NoError(err)

			mbRef.Num++
			mbRef.Hash = common.BytesToHash(header.Hash)
		}

		si := &Stream{
			params:              leaderInstance.params,
			streamId:            streamId,
			lastAppliedBlockNum: leaderInstance.params.AppliedBlockNum,
			local:               &localStreamState{},
		}
		si.nodesLocked.Reset(nodes, leaderInstance.params.Wallet.Address)

		err = leaderInstance.cache.normalizeEphemeralStream(ctx, si, int64(chunks), true)
		tc.require.NoError(err)
	})

	t.Run("normalize ephemeral stream - replicas has nothing", func(t *testing.T) {
		streamId, err := StreamIdFromString(STREAM_MEDIA_PREFIX + strings.Repeat("2", 62))
		tc.require.NoError(err)

		mb := MakeGenesisMiniblockForMediaStream(
			tc.t,
			tc.clientWallet,
			leaderInstance.params.Wallet,
			&MediaPayload_Inception{StreamId: streamId[:], ChannelId: channelId[:], ChunkCount: chunks},
		)
		mbBytes, err := mb.ToBytes()
		tc.require.NoError(err)

		err = leaderInstance.params.Storage.CreateEphemeralStreamStorage(ctx, streamId, mbBytes)
		tc.require.NoError(err)

		mbRef := *mb.Ref
		mediaChunks := make([][]byte, chunks)
		for i := 0; i < chunks; i++ {
			// Create media chunk event
			mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
			mp := Make_MediaPayload_Chunk(mediaChunks[i], int32(i))
			envelope, err := MakeEnvelopeWithPayload(leaderInstance.params.Wallet, mp, &mbRef)
			tc.require.NoError(err)

			header, err := MakeEnvelopeWithPayload(leaderInstance.params.Wallet, Make_MiniblockHeader(&MiniblockHeader{
				MiniblockNum:      mbRef.Num + 1,
				PrevMiniblockHash: mbRef.Hash[:],
				EventHashes:       [][]byte{envelope.Hash},
			}), &mbRef)
			tc.require.NoError(err)

			mbBytes, err := proto.Marshal(&Miniblock{
				Events: []*Envelope{envelope},
				Header: header,
			})
			tc.require.NoError(err)

			err = leaderInstance.params.Storage.WriteEphemeralMiniblock(ctx, streamId, &storage.WriteMiniblockData{
				Number: mbRef.Num + 1,
				Hash:   common.BytesToHash(header.Hash),
				Data:   mbBytes,
			})
			tc.require.NoError(err)

			mbRef.Num++
			mbRef.Hash = common.BytesToHash(header.Hash)
		}

		mockNode2NodeHandler := mocks.NewMockNodeToNodeHandler(t)
		mockNode2NodeHandler.On("GetMiniblocksByIds", mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				req, ok := args.Get(1).(*connect.Request[GetMiniblocksByIdsRequest])
				tc.require.True(ok)
				resp, ok := args.Get(2).(*connect.ServerStream[GetMiniblockResponse])
				tc.require.True(ok)

				streamId, err := StreamIdFromBytes(req.Msg.GetStreamId())
				tc.require.NoError(err)

				err = leaderInstance.params.Storage.ReadMiniblocksByIds(
					ctx,
					streamId,
					req.Msg.GetMiniblockIds(),
					func(blockdata []byte, seqNum int64) error {
						var mb Miniblock
						if err = proto.Unmarshal(blockdata, &mb); err != nil {
							return WrapRiverError(Err_BAD_BLOCK, err).Message("Unable to unmarshal miniblock")
						}

						return resp.Send(&GetMiniblockResponse{
							Num:       seqNum,
							Miniblock: &mb,
						})
					},
				)
				tc.require.NoError(err)
			}).Return(nil)

		_, handler := protocolconnect.NewNodeToNodeHandler(mockNode2NodeHandler)

		httpSrv := httptest.NewServer(handler)
		defer httpSrv.Close()
		httpClient, _ := testcert.GetHttp2LocalhostTLSClient(ctx, nil)
		nodeToNode := protocolconnect.NewNodeToNodeClient(httpClient, httpSrv.URL, connect.WithGRPCWeb())

		nodeRegistry := mocks.NewMockNodeRegistry(t)
		nodeRegistry.On("GetNodeToNodeClientForAddress", mock.IsType(common.Address{})).
			Return(nodeToNode, nil)

		replica := tc.instances[1]
		replica.params.NodeRegistry = nodeRegistry

		si := &Stream{
			params:              replica.params,
			streamId:            streamId,
			lastAppliedBlockNum: replica.params.AppliedBlockNum,
			local:               &localStreamState{},
		}
		si.nodesLocked.Reset(nodes, replica.params.Wallet.Address)

		err = replica.cache.normalizeEphemeralStream(ctx, si, int64(chunks), true)
		tc.require.NoError(err)
	})
}
