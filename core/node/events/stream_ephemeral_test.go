package events

import (
	"fmt"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
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
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	channelId := testutils.MakeChannelId(spaceId)

	t.Run("normalize ephemeral stream - all miniblocks exist", func(t *testing.T) {
		streamId, err := StreamIdFromString(STREAM_MEDIA_PREFIX + strings.Repeat("1", 62))
		tc.require.NoError(err)

		mb := MakeGenesisMiniblockForMediaStream(
			tc.t,
			tc.clientWallet,
			leaderInstance.params.Wallet,
			&MediaPayload_Inception{StreamId: streamId[:], ChannelId: channelId[:], ChunkCount: chunks},
		)
		storageMb, err := mb.AsStorageMb()
		tc.require.NoError(err)

		err = leaderInstance.params.Storage.CreateEphemeralStreamStorage(ctx, streamId, storageMb)
		tc.require.NoError(err)

		mbRef := *mb.Ref
		mediaChunks := make([][]byte, chunks)
		for i := 0; i < chunks; i++ {
			// Create media chunk event
			mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
			mp := Make_MediaPayload_Chunk(mediaChunks[i], int32(i), nil)
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

			err = leaderInstance.params.Storage.WriteEphemeralMiniblock(ctx, streamId, &storage.MiniblockDescriptor{
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
		si.nodesLocked.Reset(len(nodes), nodes, leaderInstance.params.Wallet.Address)

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
		storageMb, err := mb.AsStorageMb()
		tc.require.NoError(err)

		err = leaderInstance.params.Storage.CreateEphemeralStreamStorage(ctx, streamId, storageMb)
		tc.require.NoError(err)

		mbRef := *mb.Ref
		mediaChunks := make([][]byte, chunks)
		for i := 0; i < chunks; i++ {
			// Create media chunk event
			mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
			mp := Make_MediaPayload_Chunk(mediaChunks[i], int32(i), nil)
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

			err = leaderInstance.params.Storage.WriteEphemeralMiniblock(ctx, streamId, &storage.MiniblockDescriptor{
				Number: mbRef.Num + 1,
				Hash:   common.BytesToHash(header.Hash),
				Data:   mbBytes,
			})
			tc.require.NoError(err)

			mbRef.Num++
			mbRef.Hash = common.BytesToHash(header.Hash)
		}

		replica := tc.instances[1]

		si := &Stream{
			params:              replica.params,
			streamId:            streamId,
			lastAppliedBlockNum: replica.params.AppliedBlockNum,
			local:               &localStreamState{},
		}
		si.nodesLocked.Reset(len(nodes), nodes, replica.params.Wallet.Address)

		err = replica.cache.normalizeEphemeralStream(ctx, si, int64(chunks), true)
		tc.require.NoError(err)
	})
}
