package rpc

import (
	"fmt"
	"strings"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// TestCreateEphemeralStream tests creating an ephemeral stream using internode RPC endpoints.
func TestCreateEphemeralStream(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})

	alice := tt.newTestClient(0)
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _ := alice.createChannel(spaceId)

	// Nodes should accept ephemeral miniblocks even if a stream does not exist.
	t.Run("Send ephemeral miniblock for non-existing stream", func(t *testing.T) {
		mediaStreamId, err := StreamIdFromString(STREAM_MEDIA_PREFIX + strings.Repeat("4", 62))
		tt.require.NoError(err)

		mb := &MiniblockRef{
			Hash: common.BytesToHash([]byte{1, 2, 3}),
			Num:  0,
		}

		mp := events.Make_MediaPayload_Chunk([]byte("non-existing stream"), 0)
		envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
		tt.require.NoError(err)

		header, err := events.MakeEnvelopeWithPayload(alice.wallet, events.Make_MiniblockHeader(&MiniblockHeader{
			MiniblockNum:      mb.Num + 1,
			PrevMiniblockHash: mb.Hash.Bytes(),
			EventHashes:       [][]byte{envelope.Hash},
		}), mb)
		tt.require.NoError(err)

		_, err = alice.node2nodeClient.SaveEphemeralMiniblock(alice.ctx, connect.NewRequest(&SaveEphemeralMiniblockRequest{
			StreamId: mediaStreamId[:],
			Miniblock: &Miniblock{
				Events: []*Envelope{envelope},
				Header: header,
			},
		}))
		tt.require.NoError(err)
	})

	mediaStreamId, err := StreamIdFromString(STREAM_MEDIA_PREFIX + strings.Repeat("0", 62))
	tt.require.NoError(err)

	const chunks = 10
	inception, err := events.MakeEnvelopeWithPayload(
		alice.wallet,
		events.Make_MediaPayload_Inception(&MediaPayload_Inception{
			StreamId:   mediaStreamId[:],
			ChannelId:  channelId[:],
			SpaceId:    spaceId[:],
			UserId:     alice.userId[:],
			ChunkCount: chunks,
		}),
		nil,
	)
	tt.require.NoError(err)

	parsedEvents, err := events.ParseEvents([]*Envelope{inception})
	tt.require.NoError(err)

	genesisMb, err := events.MakeGenesisMiniblock(alice.wallet, parsedEvents)
	tt.require.NoError(err)

	// Create ephemeral media stream
	_, err = alice.node2nodeClient.AllocateEphemeralStream(alice.ctx, connect.NewRequest(&AllocateEphemeralStreamRequest{
		Miniblock: genesisMb,
		StreamId:  mediaStreamId[:],
	}))
	tt.require.NoError(err)

	mb := &MiniblockRef{
		Hash: common.BytesToHash(genesisMb.Header.Hash),
		Num:  0,
	}
	mediaChunks := make([][]byte, chunks)
	for i := 0; i < chunks; i++ {
		// Create media chunk event
		mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
		mp := events.Make_MediaPayload_Chunk(mediaChunks[i], int32(i))
		envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
		tt.require.NoError(err)

		header, err := events.MakeEnvelopeWithPayload(alice.wallet, events.Make_MiniblockHeader(&MiniblockHeader{
			MiniblockNum:      int64(i + 1),
			PrevMiniblockHash: mb.Hash[:],
			EventHashes:       [][]byte{envelope.Hash},
		}), mb)
		tt.require.NoError(err)

		_, err = alice.node2nodeClient.SaveEphemeralMiniblock(alice.ctx, connect.NewRequest(&SaveEphemeralMiniblockRequest{
			StreamId: mediaStreamId[:],
			Miniblock: &Miniblock{
				Events: []*Envelope{envelope},
				Header: header,
			},
		}))
		tt.require.NoError(err)

		mb.Num = int64(i + 1)
		mb.Hash = common.BytesToHash(header.Hash)
	}

	// Seal the stream
	_, err = alice.node2nodeClient.SealEphemeralStream(alice.ctx, connect.NewRequest(&SealEphemeralStreamRequest{
		StreamId: mediaStreamId[:],
	}))
	tt.require.NoError(err)

	// No events in storage since the stream still ephemeral.
	// The first miniblock is the stream creation miniblock, the rest 10 are media chunks.
	tt.compareStreamDataInStorage(t, mediaStreamId, 11, 0)
}
