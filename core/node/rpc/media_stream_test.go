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

	/*
		=== CONT  TestCreateMediaStream
		    media_stream_test.go:109:
		        	Error Trace:	/Users/romanbehma/go/src/github.com/towns-protocol/towns/core/node/rpc/media_stream_test.go:109
		        	Error:      	Not equal:
		        	            	expected: &protocol.CreationCookie{state:impl.MessageState{NoUnkeyedLiterals:pragma.NoUnkeyedLiterals{}, DoNotCompare:pragma.DoNotCompare{}, DoNotCopy:pragma.DoNotCopy{}, atomicMessageInfo:(*impl.MessageInfo)(nil)}, sizeCache:0, unknownFields:[]uint8(nil), StreamId:[]uint8{0xff, 0x8f, 0xee, 0x3c, 0x70, 0x73, 0x23, 0x32, 0xd6, 0x4a, 0xf8, 0x66, 0x2e, 0xe, 0xc2, 0x55, 0xe1, 0x2f, 0xb, 0xbf, 0xf, 0x1c, 0xfd, 0xf2, 0xbd, 0x37, 0x2a, 0x11, 0x90, 0x5, 0x8d, 0x9b}, Nodes:[][]uint8{[]uint8{0xc, 0x36, 0x9c, 0x3e, 0xba, 0xeb, 0x87, 0x3c, 0x7d, 0x85, 0xda, 0xe, 0x77, 0xcd, 0x63, 0x29, 0x63, 0x27, 0x65, 0xb6}, []uint8{0x8e, 0xfa, 0x60, 0xed, 0x75, 0x62, 0xd8, 0x68, 0x1f, 0xf7, 0xf8, 0xfd, 0xb7, 0x65, 0xef, 0x13, 0x21, 0x32, 0xeb, 0xd2}, []uint8{0x7a, 0x99, 0x3f, 0x8c, 0xa3, 0x5d, 0x40, 0xbf, 0xf7, 0x39, 0xae, 0x2a, 0x49, 0x9, 0xd5, 0x2e, 0xb3, 0x43, 0x26, 0xbf}}, MiniblockNum:2, PrevMiniblockHash:[]uint8{0x96, 0xba, 0xb2, 0xe9, 0xad, 0x66, 0xfe, 0xa1, 0x8c, 0x26, 0xca, 0xf8, 0x6, 0x4e, 0x82, 0x69, 0x8f, 0x24, 0xfb, 0xed, 0x98, 0xff, 0xdd, 0x77, 0x54, 0x4f, 0xec, 0x7c, 0x2c, 0xea, 0xcf, 0x4e}}
		        	            	actual  : &protocol.CreationCookie{state:impl.MessageState{NoUnkeyedLiterals:pragma.NoUnkeyedLiterals{}, DoNotCompare:pragma.DoNotCompare{}, DoNotCopy:pragma.DoNotCopy{}, atomicMessageInfo:(*impl.MessageInfo)(nil)}, sizeCache:0, unknownFields:[]uint8(nil), StreamId:[]uint8{0xff, 0x8f, 0xee, 0x3c, 0x70, 0x73, 0x23, 0x32, 0xd6, 0x4a, 0xf8, 0x66, 0x2e, 0xe, 0xc2, 0x55, 0xe1, 0x2f, 0xb, 0xbf, 0xf, 0x1c, 0xfd, 0xf2, 0xbd, 0x37, 0x2a, 0x11, 0x90, 0x5, 0x8d, 0x9b}, Nodes:[][]uint8{[]uint8{0xc, 0x36, 0x9c, 0x3e, 0xba, 0xeb, 0x87, 0x3c, 0x7d, 0x85, 0xda, 0xe, 0x77, 0xcd, 0x63, 0x29, 0x63, 0x27, 0x65, 0xb6}, []uint8{0x8e, 0xfa, 0x60, 0xed, 0x75, 0x62, 0xd8, 0x68, 0x1f, 0xf7, 0xf8, 0xfd, 0xb7, 0x65, 0xef, 0x13, 0x21, 0x32, 0xeb, 0xd2}, []uint8{0x7a, 0x99, 0x3f, 0x8c, 0xa3, 0x5d, 0x40, 0xbf, 0xf7, 0x39, 0xae, 0x2a, 0x49, 0x9, 0xd5, 0x2e, 0xb3, 0x43, 0x26, 0xbf}}, MiniblockNum:2, PrevMiniblockHash:[]uint8{0xbf, 0xe6, 0x98, 0x84, 0x71, 0xda, 0x29, 0x58, 0x15, 0x53, 0xe2, 0x5d, 0x70, 0xe6, 0x80, 0x3e, 0x57, 0x5c, 0x1c, 0x9a, 0x4e, 0xbe, 0x92, 0x75, 0xf2, 0x82, 0x7d, 0x58, 0x75, 0x99, 0x2f, 0x61}}

		        	            	Diff:
		        	            	--- Expected
		        	            	+++ Actual
		        	            	@@ -32,4 +32,4 @@
		        	            	  PrevMiniblockHash: ([]uint8) (len=32) {
		        	            	-  00000000  96 ba b2 e9 ad 66 fe a1  8c 26 ca f8 06 4e 82 69  |.....f...&...N.i|
		        	            	-  00000010  8f 24 fb ed 98 ff dd 77  54 4f ec 7c 2c ea cf 4e  |.$.....wTO.|,..N|
		        	            	+  00000000  bf e6 98 84 71 da 29 58  15 53 e2 5d 70 e6 80 3e  |....q.)X.S.]p..>|
		        	            	+  00000010  57 5c 1c 9a 4e be 92 75  f2 82 7d 58 75 99 2f 61  |W\..N..u..}Xu./a|
		        	            	  }
		        	Test:       	TestCreateMediaStream
		=== RUN   TestCreateMediaStream/Duplicated_CreateMediaStream_event
	*/
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
			tt.require.NoError(err)

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
