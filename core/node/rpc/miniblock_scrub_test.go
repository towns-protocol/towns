package rpc

import (
	"context"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/scrub"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func addMessageToChannel(
	ctx context.Context,
	client protocolconnect.StreamServiceClient,
	wallet *crypto.Wallet,
	text string,
	channelId StreamId,
	channelHash *MiniblockRef,
	require *require.Assertions,
) {
	message, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Message(text),
		channelHash,
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    message,
			},
		),
	)
	require.NoError(err)
}

func TestMiniblockScrubberBasic(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	reports := make(chan *scrub.MiniblockScrubReport)
	client := tester.testClient(0)

	ctx := tester.ctx
	require := tester.require

	scrubber := scrub.NewMiniblockScrubber(
		tester.nodes[0].service.Storage(),
		1,
		reports,
		infra.NewMetricsFactory(nil, "", ""),
	)
	defer close(reports)
	defer scrubber.Close()

	wallet, _ := crypto.NewWallet(ctx)

	resuser, _, err := createUser(ctx, wallet, client, nil)
	require.NoError(err)
	require.NotNil(resuser)
	userStreamId, err := StreamIdFromBytes(resuser.StreamId)
	require.NoError(err)

	// Miniblock scrub of user stream succeeds and report matches latest state of
	// the stream.
	require.NoError(scrubber.ScheduleStreamMiniblocksScrub(ctx, userStreamId, 0))
	report := <-reports
	require.Equal(userStreamId, report.StreamId)
	require.NoError(report.ScrubError)
	require.Equal(resuser.MinipoolGen-1, report.LatestBlockScrubbed)
	require.Equal(int64(-1), report.FirstCorruptBlock)

	_, _, err = createUserMetadataStream(ctx, wallet, client, nil)
	require.NoError(err)

	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space, _, err := createSpace(ctx, wallet, client, spaceId, nil)
	require.NoError(err)
	require.NotNil(space)

	channelId := testutils.MakeChannelId(spaceId)
	channel, channelHash, err := createChannel(
		ctx,
		wallet,
		client,
		spaceId,
		channelId,
		&protocol.StreamSettings{DisableMiniblockCreation: true}, // manually control miniblock creation
	)
	require.NoError(err)
	require.NotNil(channel)
	b0ref, err := makeMiniblock(ctx, client, channelId, false, -1)
	require.NoError(err)
	require.Equal(int64(0), b0ref.Num)

	wallet2, _ := crypto.NewWallet(ctx)
	createUserAndAddToChannel(require, ctx, client, wallet2, spaceId, channelId)
	addMessageToChannel(ctx, client, wallet, "hi!", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet2, "hello!", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet, "hey how are you?", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet2, "another message", channelId, channelHash, require)

	b1ref, err := makeMiniblock(ctx, client, channelId, true, 0)
	require.NoError(err)
	require.Equal(int64(1), b1ref.Num)

	addMessageToChannel(ctx, client, wallet, "hi!", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet2, "hello!", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet, "hey how are you?", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet2, "another message", channelId, channelHash, require)

	b2ref, err := makeMiniblock(ctx, client, channelId, false, 0)
	require.NoError(err)
	require.Equal(int64(2), b2ref.Num)

	// Miniblock scrub of channel
	require.NoError(scrubber.ScheduleStreamMiniblocksScrub(ctx, channelId, 0))
	report = <-reports

	require.Equal(channelId, report.StreamId)
	require.NoError(report.ScrubError)
	require.Equal(int64(2), report.LatestBlockScrubbed)
	require.Equal(int64(-1), report.FirstCorruptBlock)

	// Starting at any miniblock number should produce the same report.
	require.NoError(scrubber.ScheduleStreamMiniblocksScrub(ctx, channelId, 1))
	report = <-reports

	require.Equal(channelId, report.StreamId)
	require.NoError(report.ScrubError)
	require.Equal(int64(2), report.LatestBlockScrubbed)
	require.Equal(int64(-1), report.FirstCorruptBlock)

	require.NoError(scrubber.ScheduleStreamMiniblocksScrub(ctx, channelId, 2))
	report = <-reports

	require.Equal(channelId, report.StreamId)
	require.NoError(report.ScrubError)
	require.Equal(int64(2), report.LatestBlockScrubbed)
	require.Equal(int64(-1), report.FirstCorruptBlock)

	// Reading with a start block past the stream length produces an error
	require.ErrorContains(
		scrubber.ScheduleStreamMiniblocksScrub(ctx, channelId, 3),
		"Miniblock has not caught up to fromBlockNum",
	)
}

func createMultiblockChannelStream(
	ctx context.Context,
	require *require.Assertions,
	client protocolconnect.StreamServiceClient,
	store storage.StreamStorage,
) (
	streamId StreamId,
	mb1 *events.MiniblockInfo,
	mbs []*storage.MiniblockDescriptor,
) {
	wallet, _ := crypto.NewWallet(ctx)

	resuser, _, err := createUser(ctx, wallet, client, nil)
	require.NoError(err)
	require.NotNil(resuser)
	_, err = StreamIdFromBytes(resuser.StreamId)
	require.NoError(err)

	_, _, err = createUserMetadataStream(ctx, wallet, client, nil)
	require.NoError(err)

	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space, _, err := createSpace(ctx, wallet, client, spaceId, nil)
	require.NoError(err)
	require.NotNil(space)

	channelId := testutils.MakeChannelId(spaceId)
	channel, channelHash, err := createChannel(
		ctx,
		wallet,
		client,
		spaceId,
		channelId,
		&protocol.StreamSettings{DisableMiniblockCreation: true}, // manually control miniblock creation
	)
	require.NoError(err)
	require.NotNil(channel)
	b0ref, err := makeMiniblock(ctx, client, channelId, false, -1)
	require.NoError(err)
	require.Equal(int64(0), b0ref.Num)

	wallet2, _ := crypto.NewWallet(ctx)
	createUserAndAddToChannel(require, ctx, client, wallet2, spaceId, channelId)
	addMessageToChannel(ctx, client, wallet, "hi!", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet2, "hello!", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet, "hey how are you?", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet2, "another message", channelId, channelHash, require)

	b1ref, err := makeMiniblock(ctx, client, channelId, true, 0)
	require.NoError(err)
	require.Equal(int64(1), b1ref.Num)

	addMessageToChannel(ctx, client, wallet, "hi!", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet2, "hello!", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet, "hey how are you?", channelId, channelHash, require)
	addMessageToChannel(ctx, client, wallet2, "another message", channelId, channelHash, require)

	b2ref, err := makeMiniblock(ctx, client, channelId, false, 0)
	require.NoError(err)
	require.Equal(int64(2), b2ref.Num)

	blocks, terminus, err := store.ReadMiniblocks(ctx, channelId, 0, 3, false)
	require.NoError(err)
	require.Len(blocks, 3)
	require.True(terminus)

	require.NoError(store.(*storage.PostgresStreamStore).DeleteStream(ctx, channelId))

	mb1, err = events.NewMiniblockInfoFromDescriptor(blocks[1])
	require.NoError(err)
	require.NotNil(mb1)

	return channelId, mb1, blocks
}

func writeStreamBackToStore(
	ctx context.Context,
	require *require.Assertions,
	store storage.StreamStorage,
	streamId StreamId,
	mb1 *events.MiniblockInfo,
	blocks []*storage.MiniblockDescriptor,
) {
	mb2, err := events.NewMiniblockInfoFromDescriptor(blocks[2])
	require.NoError(err)
	require.NotNil(mb2)

	// Re-write the stream with corrupt block 1
	require.NoError(store.CreateStreamStorage(ctx, streamId, &storage.MiniblockDescriptor{Data: blocks[0].Data}))
	require.NoError(
		store.WriteMiniblocks(
			ctx,
			streamId,
			[]*storage.MiniblockDescriptor{
				{
					Number:   1,
					Hash:     mb1.Ref.Hash,
					Snapshot: blocks[1].Snapshot,
					Data:     blocks[1].Data,
				},
				{
					Number:   2,
					Hash:     mb2.Ref.Hash,
					Snapshot: blocks[2].Snapshot,
					Data:     blocks[2].Data,
				},
			},
			3,
			[][]byte{},
			1,
			0,
		),
	)
}

func invalidateBlockHeaderEventLength(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	// Pop a couple of events from block 1 to invalidate the event hashes in the
	// header.
	var pb protocol.Miniblock
	err := proto.Unmarshal(block, &pb)
	require.NoError(err)
	pb.Events = pb.Events[0 : len(pb.Events)-2]
	block, err = proto.Marshal(&pb)
	require.NoError(err)
	return block
}

func invalidateEventHash(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	var pb protocol.Miniblock
	err := proto.Unmarshal(block, &pb)
	require.NoError(err)
	// Corrupt the event hash
	pb.Events[0].Hash[0] = 'a'
	pb.Events[0].Hash[1] = 'a'
	pb.Events[0].Hash[2] = 'a'
	block, err = proto.Marshal(&pb)
	require.NoError(err)
	return block
}

func invalidateBlockHeaderType(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	var pb protocol.Miniblock
	err := proto.Unmarshal(block, &pb)
	require.NoError(err)

	// Header event wrong type
	pb.Header = pb.Events[0]

	block, err = proto.Marshal(&pb)
	require.NoError(err)
	return block
}

func invalidateMiniblockUnparsable(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	return []byte("invalid_miniblock")
}

func invalidateBlockNumber(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	var pb protocol.Miniblock
	err := proto.Unmarshal(block, &pb)
	require.NoError(err)

	headerEvent, err := events.ParseEvent(pb.Header)
	require.NoError(err)
	blockHeader := headerEvent.Event.GetMiniblockHeader()

	// Wrong block number
	blockHeader.MiniblockNum = 2

	// Re-sign and re-hash header event
	mb0Ref := MiniblockRef{
		Hash: common.Hash(blockHeader.PrevMiniblockHash),
		Num:  0,
	}
	modStreamEvent, err := events.MakeStreamEvent(
		wallet,
		&protocol.StreamEvent_MiniblockHeader{MiniblockHeader: blockHeader},
		&mb0Ref,
	)
	require.NoError(err)
	modHeaderEvent, err := events.MakeEnvelopeWithEvent(wallet, modStreamEvent)
	require.NoError(err)
	pb.Header = modHeaderEvent

	// Return updated bytes
	block, err = proto.Marshal(&pb)
	require.NoError(err)
	return block
}

func mismatchEventHash(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	var pb protocol.Miniblock
	err := proto.Unmarshal(block, &pb)
	require.NoError(err)

	// Block events now does not match header events
	pb.Events[0] = pb.Events[1]

	block, err = proto.Marshal(&pb)
	require.NoError(err)
	return block
}

func invalidatePrevMiniblockHash(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	var pb protocol.Miniblock
	err := proto.Unmarshal(block, &pb)
	require.NoError(err)

	headerEvent, err := events.ParseEvent(pb.Header)
	require.NoError(err)
	blockHeader := headerEvent.Event.GetMiniblockHeader()

	// Wrong previous miniblock hash
	blockHeader.PrevMiniblockHash = []byte("1234567890abcdef1234567890abcdef")

	// Re-sign and re-hash header event
	mb0Ref := MiniblockRef{
		Hash: common.Hash(blockHeader.PrevMiniblockHash),
		Num:  0,
	}
	modStreamEvent, err := events.MakeStreamEvent(
		wallet,
		&protocol.StreamEvent_MiniblockHeader{MiniblockHeader: blockHeader},
		&mb0Ref,
	)
	require.NoError(err)
	modHeaderEvent, err := events.MakeEnvelopeWithEvent(wallet, modStreamEvent)
	require.NoError(err)
	pb.Header = modHeaderEvent

	// Return updated bytes
	block, err = proto.Marshal(&pb)
	require.NoError(err)
	return block
}

func invalidateEventNumOffset(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	var pb protocol.Miniblock
	err := proto.Unmarshal(block, &pb)
	require.NoError(err)

	headerEvent, err := events.ParseEvent(pb.Header)
	require.NoError(err)
	blockHeader := headerEvent.Event.GetMiniblockHeader()

	// Wrong event num offset
	blockHeader.EventNumOffset = 11

	// Re-sign and re-hash header event
	mb0Ref := MiniblockRef{
		Hash: common.Hash(blockHeader.PrevMiniblockHash),
		Num:  0,
	}
	modStreamEvent, err := events.MakeStreamEvent(
		wallet,
		&protocol.StreamEvent_MiniblockHeader{MiniblockHeader: blockHeader},
		&mb0Ref,
	)
	require.NoError(err)
	modHeaderEvent, err := events.MakeEnvelopeWithEvent(wallet, modStreamEvent)
	require.NoError(err)
	pb.Header = modHeaderEvent

	// Return updated bytes
	block, err = proto.Marshal(&pb)
	require.NoError(err)
	return block
}

func invalidateBlockTimestamp(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	var pb protocol.Miniblock
	err := proto.Unmarshal(block, &pb)
	require.NoError(err)

	headerEvent, err := events.ParseEvent(pb.Header)
	require.NoError(err)
	blockHeader := headerEvent.Event.GetMiniblockHeader()

	// Bad timestamp (from yesterday)
	badTimestamp := time.Now().AddDate(0, 0, -1).Unix()
	blockHeader.Timestamp = &timestamppb.Timestamp{
		Seconds: badTimestamp,
		Nanos:   0,
	}

	// Re-sign and re-hash header event
	mb0Ref := MiniblockRef{
		Hash: common.Hash(blockHeader.PrevMiniblockHash),
		Num:  0,
	}
	modStreamEvent, err := events.MakeStreamEvent(
		wallet,
		&protocol.StreamEvent_MiniblockHeader{MiniblockHeader: blockHeader},
		&mb0Ref,
	)
	require.NoError(err)
	modHeaderEvent, err := events.MakeEnvelopeWithEvent(wallet, modStreamEvent)
	require.NoError(err)
	pb.Header = modHeaderEvent

	// Return updated bytes
	block, err = proto.Marshal(&pb)
	require.NoError(err)
	return block
}

func invalidatePrevSnapshotBlockNum(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte {
	var pb protocol.Miniblock
	err := proto.Unmarshal(block, &pb)
	require.NoError(err)

	headerEvent, err := events.ParseEvent(pb.Header)
	require.NoError(err)
	blockHeader := headerEvent.Event.GetMiniblockHeader()

	// Invalid
	blockHeader.PrevSnapshotMiniblockNum = 11

	// Re-sign and re-hash header event
	mb0Ref := MiniblockRef{
		Hash: common.Hash(blockHeader.PrevMiniblockHash),
		Num:  0,
	}
	modStreamEvent, err := events.MakeStreamEvent(
		wallet,
		&protocol.StreamEvent_MiniblockHeader{MiniblockHeader: blockHeader},
		&mb0Ref,
	)
	require.NoError(err)
	modHeaderEvent, err := events.MakeEnvelopeWithEvent(wallet, modStreamEvent)
	require.NoError(err)
	pb.Header = modHeaderEvent

	// Return updated bytes
	block, err = proto.Marshal(&pb)
	require.NoError(err)
	return block
}

type corruptMiniblockBytesFunc func(require *require.Assertions, wallet *crypto.Wallet, block []byte) []byte

func TestMiniblockScrubber_CorruptBlocks(t *testing.T) {
	tests := map[string]struct {
		corruptBlock corruptMiniblockBytesFunc
		expectedErr  string
	}{
		"Bad header event length": {
			corruptBlock: invalidateBlockHeaderEventLength,
			expectedErr:  "(38:BAD_BLOCK) Length of events in block does not match length of event hashes in header",
		},
		"Invalid event hash in block": {
			corruptBlock: invalidateEventHash,
			expectedErr:  "(35:BAD_EVENT_HASH) Bad hash provided",
		},
		"Invalid header event type": {
			corruptBlock: invalidateBlockHeaderType,
			expectedErr:  "(26:BAD_EVENT) Header event must be a block header",
		},
		"Unparsable miniblock": {
			corruptBlock: invalidateMiniblockUnparsable,
			expectedErr:  "(3:INVALID_ARGUMENT) Failed to decode miniblock from bytes",
		},
		"Invalid block number": {
			corruptBlock: invalidateBlockNumber,
			expectedErr:  "(40:BAD_BLOCK_NUMBER) block number does not equal expected",
		},
		"Mismatched event hash": {
			corruptBlock: mismatchEventHash,
			expectedErr:  "(38:BAD_BLOCK) Block event hash did not match hash in header",
		},
		"Invalid previous miniblock hash": {
			corruptBlock: invalidatePrevMiniblockHash,
			expectedErr:  "(38:BAD_BLOCK) Last miniblock hash does not equal expected",
		},
		"Invalid eventNumOffset": {
			corruptBlock: invalidateEventNumOffset,
			expectedErr:  "(38:BAD_BLOCK) Miniblock header eventNumOffset does not equal expected",
		},
		"Invalid block timestamp": {
			corruptBlock: invalidateBlockTimestamp,
			expectedErr:  "(38:BAD_BLOCK) Expected header timestamp to occur after minimum time",
		},
		"Bad previous snapshot miniblock number": {
			corruptBlock: invalidatePrevSnapshotBlockNum,
			expectedErr:  "(38:BAD_BLOCK) Previous snapshot miniblock num did not match expected",
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
			reports := make(chan *scrub.MiniblockScrubReport)
			client := tester.testClient(0)

			ctx := tester.ctx
			require := tester.require
			store := tester.nodes[0].service.storage

			scrubber := scrub.NewMiniblockScrubber(
				tester.nodes[0].service.Storage(),
				1,
				reports,
				infra.NewMetricsFactory(nil, "", ""),
			)
			defer close(reports)
			defer scrubber.Close()

			channelId, mb1, blocks := createMultiblockChannelStream(ctx, require, client, store)

			// Corrupt block 1
			blocks[1].Data = tc.corruptBlock(require, tester.nodes[0].service.wallet, blocks[1].Data)

			writeStreamBackToStore(ctx, require, store, channelId, mb1, blocks)

			// Start at block 0. We will evaluate block 1 as corrupt and report it as so.
			require.NoError(scrubber.ScheduleStreamMiniblocksScrub(ctx, channelId, 0))
			report := <-reports

			require.Equal(channelId, report.StreamId)
			require.ErrorContains(report.ScrubError, tc.expectedErr)
			require.Equal(int64(0), report.LatestBlockScrubbed)
			require.Equal(int64(1), report.FirstCorruptBlock)
		})
	}
}
