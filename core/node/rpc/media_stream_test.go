package rpc

import (
	"fmt"
	"strings"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

// TestCreateMediaStream tests creating a media stream
func TestCreateMediaStream(t *testing.T) {
	const chunks = 10
	iv := []byte{1, 3, 3}
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 3, start: true})

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)

	createMediaStream := func(firstChunk []byte) *protocol.CreationCookie {
		var err error
		mediaStreamId := testutils.FakeStreamId(STREAM_MEDIA_BIN)
		initialEvents := make([]*protocol.Envelope, 1, 2)

		// Create inception event
		var trueVal = true
		initialEvents[0], err = events.MakeEnvelopeWithPayload(
			alice.wallet,
			events.Make_MediaPayload_Inception(&protocol.MediaPayload_Inception{
				StreamId:           mediaStreamId[:],
				ChannelId:          channelId[:],
				SpaceId:            spaceId[:],
				UserId:             alice.userId[:],
				ChunkCount:         chunks,
				PerChunkEncryption: &trueVal,
			}),
			nil,
		)
		tt.require.NoError(err)

		// Create first chunk event
		if len(firstChunk) > 0 {
			mp := events.Make_MediaPayload_Chunk(firstChunk, 0, iv)
			envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, nil)
			tt.require.NoError(err)
			initialEvents = append(initialEvents, envelope)
		}

		// Create media stream
		csResp, err := alice.client.CreateMediaStream(alice.ctx, connect.NewRequest(&protocol.CreateMediaStreamRequest{
			Events:   initialEvents,
			StreamId: mediaStreamId[:],
		}))
		tt.require.NoError(err)

		return csResp.Msg.GetNextCreationCookie()
	}

	t.Run("Duplicated CreateMediaStream event", func(t *testing.T) {
		mediaStreamId := testutils.FakeStreamId(STREAM_MEDIA_BIN)

		// Create inception event
		var trueVal = true
		inception, err := events.MakeEnvelopeWithPayload(
			alice.wallet,
			events.Make_MediaPayload_Inception(&protocol.MediaPayload_Inception{
				StreamId:           mediaStreamId[:],
				ChannelId:          channelId[:],
				SpaceId:            spaceId[:],
				UserId:             alice.userId[:],
				ChunkCount:         chunks,
				PerChunkEncryption: &trueVal,
			}),
			nil,
		)
		tt.require.NoError(err)

		// Create chunk events
		mp1 := events.Make_MediaPayload_Chunk([]byte("chunk 0"), 0, iv)
		chunk1, err := events.MakeEnvelopeWithPayload(alice.wallet, mp1, nil)
		tt.require.NoError(err)

		// Create media stream
		csResp, err := alice.client.CreateMediaStream(alice.ctx, connect.NewRequest(&protocol.CreateMediaStreamRequest{
			Events:   []*protocol.Envelope{inception, chunk1},
			StreamId: mediaStreamId[:],
		}))
		tt.require.NoError(err)
		tt.require.NotNil(csResp.Msg.NextCreationCookie)
		tt.require.Equal(mediaStreamId[:], csResp.Msg.NextCreationCookie.GetStreamId())
		tt.require.Equal(int64(2), csResp.Msg.NextCreationCookie.GetMiniblockNum())
		firstCc := csResp.Msg.NextCreationCookie

		// Create exactly the same media stream again - no errors expected
		csResp, err = alice.client.CreateMediaStream(alice.ctx, connect.NewRequest(&protocol.CreateMediaStreamRequest{
			Events:   []*protocol.Envelope{inception, chunk1},
			StreamId: mediaStreamId[:],
		}))
		tt.require.NoError(err)
		tt.require.Equal(firstCc.StreamId, csResp.Msg.NextCreationCookie.StreamId)
		tt.require.Equal(firstCc.PrevMiniblockHash, csResp.Msg.NextCreationCookie.PrevMiniblockHash)
		tt.require.Equal(firstCc.MiniblockNum, csResp.Msg.NextCreationCookie.MiniblockNum)
		tt.require.Equal(firstCc.Nodes, csResp.Msg.NextCreationCookie.Nodes)

		// Add the rest of the media chunks
		cc := csResp.Msg.NextCreationCookie
		mb := &MiniblockRef{
			Hash: common.BytesToHash(cc.PrevMiniblockHash),
			Num:  cc.MiniblockNum,
		}
		for i := 1; i < chunks; i++ {
			// Create media chunk event
			mediaChunk := []byte("chunk " + fmt.Sprint(i))
			mp := events.Make_MediaPayload_Chunk(mediaChunk, int32(i), iv)
			envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
			tt.require.NoError(err)

			// Add media chunk event
			aeResp, err := alice.client.AddMediaEvent(alice.ctx, connect.NewRequest(&protocol.AddMediaEventRequest{
				Event:          envelope,
				CreationCookie: cc,
				Last:           i == chunks-1,
			}))
			tt.require.NoError(err, i)

			mb.Hash = common.BytesToHash(aeResp.Msg.CreationCookie.PrevMiniblockHash)
			mb.Num++
			cc = aeResp.Msg.CreationCookie
		}
	})

	t.Run("CreateMediaStream failed for unexpected events count", func(t *testing.T) {
		mediaStreamId := testutils.FakeStreamId(STREAM_MEDIA_BIN)

		// Create inception event
		var trueVal = true
		inception, err := events.MakeEnvelopeWithPayload(
			alice.wallet,
			events.Make_MediaPayload_Inception(&protocol.MediaPayload_Inception{
				StreamId:           mediaStreamId[:],
				ChannelId:          channelId[:],
				SpaceId:            spaceId[:],
				UserId:             alice.userId[:],
				ChunkCount:         chunks,
				PerChunkEncryption: &trueVal,
			}),
			nil,
		)
		tt.require.NoError(err)

		// Create chunk events
		mp1 := events.Make_MediaPayload_Chunk([]byte("chunk 0"), 0, iv)
		chunk1, err := events.MakeEnvelopeWithPayload(alice.wallet, mp1, nil)
		tt.require.NoError(err)
		mp2 := events.Make_MediaPayload_Chunk([]byte("chunk 1"), 1, iv)
		chunk2, err := events.MakeEnvelopeWithPayload(alice.wallet, mp2, nil)
		tt.require.NoError(err)

		// Create media stream
		csResp, err := alice.client.CreateMediaStream(alice.ctx, connect.NewRequest(&protocol.CreateMediaStreamRequest{
			Events:   []*protocol.Envelope{inception, chunk1, chunk2},
			StreamId: mediaStreamId[:],
		}))
		tt.require.Nil(csResp)
		tt.require.Error(err)
		tt.require.Equal(connect.CodePermissionDenied, connect.CodeOf(err), err.Error())
	})

	// Make sure AddEvent does not work for ephemeral streams.
	// On-chain registration of ephemeral streams happen after the last chunk is uploaded.
	// At this time, the stream does not exist on-chain so AddEvent should fail.
	t.Run("AddEvent failed for ephemeral streams", func(t *testing.T) {
		creationCookie := createMediaStream([]byte("chunk 0"))
		mb := &MiniblockRef{
			Hash: common.BytesToHash(creationCookie.PrevMiniblockHash),
			Num:  creationCookie.MiniblockNum,
		}

		mp := events.Make_MediaPayload_Chunk([]byte("chunk 1"), 1, nil)
		envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
		require.NoError(t, err)

		aeResp, err := alice.client.AddEvent(alice.ctx, connect.NewRequest(&protocol.AddEventRequest{
			StreamId: creationCookie.StreamId,
			Event:    envelope,
		}))
		require.Nil(t, aeResp)
		require.Error(t, err)
		require.Equal(t, connect.CodeNotFound, connect.CodeOf(err), err.Error())
	})

	t.Run("AddMediaEvent failed to add event with out of range chunk index", func(t *testing.T) {
		creationCookie := createMediaStream([]byte("chunk 0"))
		mb := &MiniblockRef{
			Hash: common.BytesToHash(creationCookie.PrevMiniblockHash),
			Num:  creationCookie.MiniblockNum,
		}

		mp := events.Make_MediaPayload_Chunk([]byte("chunk 1"), chunks+1, nil)
		envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
		require.NoError(t, err)

		aeResp, err := alice.client.AddMediaEvent(alice.ctx, connect.NewRequest(&protocol.AddMediaEventRequest{
			Event:          envelope,
			CreationCookie: creationCookie,
		}))
		require.Nil(t, aeResp)
		require.Error(t, err)
		require.Equal(t, connect.CodeInvalidArgument, connect.CodeOf(err), err.Error())
	})

	t.Run("AddMediaEvent passed for ephemeral media streams with initial chunk", func(t *testing.T) {
		mediaChunks := make([][]byte, chunks)
		mediaChunks[0] = []byte("chunk 0")

		// Create media stream with the first chunk
		creationCookie := createMediaStream(mediaChunks[0])
		mb := &MiniblockRef{
			Hash: common.BytesToHash(creationCookie.PrevMiniblockHash),
			Num:  creationCookie.MiniblockNum,
		}

		// Add the rest of the media chunks
		for i := 1; i < chunks; i++ {
			// Create media chunk event
			mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
			mp := events.Make_MediaPayload_Chunk(mediaChunks[i], int32(i), iv)
			envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
			tt.require.NoError(err)

			// Add media chunk event
			aeResp, err := alice.client.AddMediaEvent(alice.ctx, connect.NewRequest(&protocol.AddMediaEventRequest{
				Event:          envelope,
				CreationCookie: creationCookie,
				Last:           i == chunks-1,
			}))
			tt.require.NoError(err)

			mb.Hash = common.BytesToHash(aeResp.Msg.CreationCookie.PrevMiniblockHash)
			mb.Num++
			creationCookie = aeResp.Msg.CreationCookie
		}

		// Make sure all replicas have the stream sealed
		for i, client := range tt.newTestClients(5, testClientOpts{}) {
			t.Run(fmt.Sprintf("Stream sealed in node %d", i), func(t *testing.T) {
				t.Parallel()

				// Get Miniblocks for the given media stream
				resp, err := client.client.GetMiniblocks(alice.ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
					StreamId:      creationCookie.StreamId,
					FromInclusive: 0,
					ToExclusive:   chunks * 2, // adding a threshold to make sure there are no unexpected events
				}))
				require.NoError(t, err)
				require.NotNil(t, resp)
				require.Len(t, resp.Msg.GetMiniblocks(), chunks+1) // The first miniblock is the stream creation one

				mbs := resp.Msg.GetMiniblocks()

				// The first miniblock is the stream creation one
				require.Len(t, mbs[0].GetEvents(), 1)
				pe, err := events.ParseEvent(mbs[0].GetEvents()[0])
				require.NoError(t, err)
				mp, ok := pe.Event.GetPayload().(*protocol.StreamEvent_MediaPayload)
				require.True(t, ok)
				require.Equal(t, int32(chunks), mp.MediaPayload.GetInception().GetChunkCount())
				require.True(t, mp.MediaPayload.GetInception().GetPerChunkEncryption())

				// The rest of the miniblocks are the media chunks
				for i, mb := range mbs[1:] {
					require.Len(t, mb.GetEvents(), 1)
					pe, err = events.ParseEvent(mb.GetEvents()[0])
					require.NoError(t, err)
					mp, ok = pe.Event.GetPayload().(*protocol.StreamEvent_MediaPayload)
					require.True(t, ok)
					require.Equal(t, mediaChunks[i], mp.MediaPayload.GetChunk().Data)
					require.Equal(t, iv, mp.MediaPayload.GetChunk().Iv)
				}
			})
		}
	})

	t.Run("AddMediaEvent passed for ephemeral media streams without initial chunk", func(t *testing.T) {
		// Create media stream with the first chunk
		creationCookie := createMediaStream(nil)
		mb := &MiniblockRef{
			Hash: common.BytesToHash(creationCookie.PrevMiniblockHash),
			Num:  creationCookie.MiniblockNum,
		}

		// Add the rest of the media chunks
		mediaChunks := make([][]byte, chunks)
		for i := 0; i < chunks; i++ {
			// Create media chunk event
			mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
			mp := events.Make_MediaPayload_Chunk(mediaChunks[i], int32(i), iv)
			envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
			tt.require.NoError(err)

			// Add media chunk event
			aeResp, err := alice.client.AddMediaEvent(alice.ctx, connect.NewRequest(&protocol.AddMediaEventRequest{
				Event:          envelope,
				CreationCookie: creationCookie,
				Last:           i == chunks-1,
			}))
			tt.require.NoError(err)

			mb.Hash = common.BytesToHash(aeResp.Msg.CreationCookie.PrevMiniblockHash)
			mb.Num++
			creationCookie = aeResp.Msg.CreationCookie
		}

		// Make sure all replicas have the stream sealed
		for i, client := range tt.newTestClients(5, testClientOpts{}) {
			t.Run(fmt.Sprintf("Stream sealed in node %d", i), func(t *testing.T) {
				t.Parallel()

				// Get Miniblocks for the given media stream
				resp, err := client.client.GetMiniblocks(alice.ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
					StreamId:      creationCookie.StreamId,
					FromInclusive: 0,
					ToExclusive:   chunks * 2, // adding a threshold to make sure there are no unexpected events
				}))
				require.NoError(t, err)
				require.NotNil(t, resp)
				require.Len(t, resp.Msg.GetMiniblocks(), chunks+1) // The first miniblock is the stream creation one

				mbs := resp.Msg.GetMiniblocks()

				// The first miniblock is the stream creation one
				require.Len(t, mbs[0].GetEvents(), 1)
				pe, err := events.ParseEvent(mbs[0].GetEvents()[0])
				require.NoError(t, err)
				mp, ok := pe.Event.GetPayload().(*protocol.StreamEvent_MediaPayload)
				require.True(t, ok)
				require.Equal(t, int32(chunks), mp.MediaPayload.GetInception().GetChunkCount())
				require.True(t, mp.MediaPayload.GetInception().GetPerChunkEncryption())

				// The rest of the miniblocks are the media chunks
				for i, mb := range mbs[1:] {
					require.Len(t, mb.GetEvents(), 1)
					pe, err = events.ParseEvent(mb.GetEvents()[0])
					require.NoError(t, err)
					mp, ok = pe.Event.GetPayload().(*protocol.StreamEvent_MediaPayload)
					require.True(t, ok)
					require.Equal(t, mediaChunks[i], mp.MediaPayload.GetChunk().Data)
					require.Equal(t, iv, mp.MediaPayload.GetChunk().Iv)
				}
			})
		}
	})
}

// TestCreateMediaStream_Legacy tests creating a media stream using endpoints for a non-media streams
func TestCreateMediaStream_Legacy(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)

	mediaStreamId, err := StreamIdFromString(STREAM_MEDIA_PREFIX + strings.Repeat("0", 62))
	tt.require.NoError(err)

	const chunks = 10
	inception, err := events.MakeEnvelopeWithPayload(
		alice.wallet,
		events.Make_MediaPayload_Inception(&protocol.MediaPayload_Inception{
			StreamId:   mediaStreamId[:],
			ChannelId:  channelId[:],
			SpaceId:    spaceId[:],
			UserId:     alice.userId[:],
			ChunkCount: chunks,
		}),
		nil,
	)
	tt.require.NoError(err)

	// Create media stream
	csResp, err := alice.client.CreateStream(alice.ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: mediaStreamId[:],
	}))
	tt.require.NoError(err)

	mb := &MiniblockRef{
		Hash: common.BytesToHash(csResp.Msg.Stream.NextSyncCookie.PrevMiniblockHash),
		Num:  0,
	}
	mediaChunks := make([][]byte, chunks)
	for i := 0; i < chunks; i++ {
		// Create media chunk event
		mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
		mp := events.Make_MediaPayload_Chunk(mediaChunks[i], int32(i), nil)
		envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
		tt.require.NoError(err)

		// Add media chunk event
		aeResp, err := alice.client.AddEvent(alice.ctx, connect.NewRequest(&protocol.AddEventRequest{
			StreamId: mediaStreamId[:],
			Event:    envelope,
		}))
		tt.require.NoError(err)
		tt.require.Nil(aeResp.Msg.Error)

		mb, err = makeMiniblock(tt.ctx, alice.client, mediaStreamId, false, int64(i))
		tt.require.NoError(err, i)
	}

	// Get Miniblocks for the given media stream
	resp, err := alice.client.GetMiniblocks(alice.ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      mediaStreamId[:],
		FromInclusive: 0,
		ToExclusive:   chunks * 2, // adding a threshold to make sure there are no unexpected events
	}))
	tt.require.NoError(err)
	tt.require.NotNil(resp)
	tt.require.Len(resp.Msg.GetMiniblocks(), chunks+1) // The first miniblock is the stream creation one

	mbs := resp.Msg.GetMiniblocks()

	// The first miniblock is the stream creation one
	tt.require.Len(mbs[0].GetEvents(), 1)
	pe, err := events.ParseEvent(mbs[0].GetEvents()[0])
	tt.require.NoError(err)
	mp, ok := pe.Event.GetPayload().(*protocol.StreamEvent_MediaPayload)
	tt.require.True(ok)
	tt.require.Equal(int32(chunks), mp.MediaPayload.GetInception().GetChunkCount())

	// The rest of the miniblocks are the media chunks
	for i, mb := range mbs[1:] {
		tt.require.Len(mb.GetEvents(), 1)
		pe, err = events.ParseEvent(mb.GetEvents()[0])
		tt.require.NoError(err)
		mp, ok = pe.Event.GetPayload().(*protocol.StreamEvent_MediaPayload)
		tt.require.True(ok)
		tt.require.Equal(mediaChunks[i], mp.MediaPayload.GetChunk().Data)
	}
}
