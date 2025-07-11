package events

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

func parsedEvent(t *testing.T, envelope *Envelope) *ParsedEvent {
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func TestLoad(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	userWallet, _ := crypto.NewWallet(ctx)
	nodeWallet, _ := crypto.NewWallet(ctx)
	cfg := crypto.DefaultOnChainSettings()
	cfg.StreamEnableNewSnapshotFormat = 1
	params := &StreamCacheParams{
		Wallet:      nodeWallet,
		ChainConfig: &mocks.MockOnChainCfg{Settings: cfg},
	}
	streamId := UserStreamIdFromAddr(userWallet.Address)

	userAddress := userWallet.Address[:]

	inception, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	assert.NoError(t, err)
	join, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, common.Address{}, nil, nil),
		nil,
	)
	assert.NoError(t, err)
	miniblockHeader, err := Make_GenesisMiniblockHeader([]*ParsedEvent{parsedEvent(t, inception), parsedEvent(t, join)})
	assert.NoError(t, err)
	miniblockHeaderProto, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_MiniblockHeader(miniblockHeader),
		nil,
	)
	assert.NoError(t, err)

	miniblockProto := &Miniblock{
		Header: miniblockHeaderProto,
		Events: []*Envelope{inception, join},
	}
	miniblockProtoBytes, err := proto.Marshal(miniblockProto)
	assert.NoError(t, err)

	view, err := MakeStreamView(
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: []*storage.MiniblockDescriptor{
				{Data: miniblockProtoBytes},
			},
		},
	)

	assert.NoError(t, err)

	assert.Equal(t, streamId, *view.StreamId())

	ip := view.InceptionPayload()
	ipStreamId, err := StreamIdFromBytes(ip.GetStreamId())
	assert.NoError(t, err)
	assert.NotNil(t, ip)
	assert.Equal(t, parsedEvent(t, inception).Event.GetInceptionPayload().GetStreamId(), ip.GetStreamId())
	assert.Equal(t, streamId, ipStreamId)

	joined, err := view.IsMember(userAddress) // joined is only valid on user, space and channel views
	assert.NoError(t, err)
	assert.True(t, joined)

	last := view.LastEvent()
	assert.NotNil(t, last)
	assert.Equal(t, join.Hash, last.Hash[:])

	miniEnvelopes := view.MinipoolEnvelopes()
	assert.Equal(t, 0, len(miniEnvelopes))

	count1 := 0
	newEnvelopesHashes := make([]common.Hash, 0)
	_ = view.forEachEvent(0, func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		assert.Equal(t, int64(count1), eventNum)
		count1++
		newEnvelopesHashes = append(newEnvelopesHashes, e.Hash)
		return true, nil
	})

	assert.Equal(t, 3, len(newEnvelopesHashes))
	assert.Equal(
		t,
		[]common.Hash{
			common.BytesToHash(inception.Hash),
			common.BytesToHash(join.Hash),
			common.BytesToHash(miniblockHeaderProto.Hash),
		},
		newEnvelopesHashes,
	)

	cookie := view.SyncCookie(nodeWallet.Address)
	cookieStreamId, err := StreamIdFromBytes(cookie.StreamId)
	assert.NoError(t, err)
	assert.NotNil(t, cookie)
	assert.Equal(t, streamId, cookieStreamId)
	assert.Equal(t, int64(1), cookie.MinipoolGen)

	// Check minipool, should be empty
	assert.Equal(t, 0, len(view.minipool.events.Values))

	// check for invalid config
	num := cfg.MinSnapshotEvents.ForType(0)
	assert.EqualValues(t, num, 100) // hard coded default

	// check snapshot generation
	assert.Equal(t, false, view.shouldSnapshot(cfg))

	// check per stream snapshot generation
	cfg.MinSnapshotEvents.User = 2
	assert.EqualValues(t, 2, cfg.MinSnapshotEvents.ForType(STREAM_USER_BIN))
	assert.Equal(t, false, view.shouldSnapshot(cfg))

	// add one more event (just join again)
	join2, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, common.Address{}, nil, nil),
		view.LastBlock().Ref,
	)
	assert.NoError(t, err)
	nextEvent := parsedEvent(t, join2)
	err = view.ValidateNextEvent(ctx, cfg, nextEvent, time.Now())
	assert.NoError(t, err)
	view, err = view.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)

	// with one new event, we shouldn't snapshot yet
	assert.Equal(t, false, view.shouldSnapshot(cfg))

	// and miniblocks should have nil snapshots
	resp, err := view.ProposeNextMiniblock(ctx, cfg, &ProposeMiniblockRequest{
		StreamId:          streamId[:],
		NewMiniblockNum:   view.minipool.generation,
		PrevMiniblockHash: view.LastBlock().Ref.Hash[:],
	})
	require.NoError(t, err)
	require.Len(t, resp.MissingEvents, view.minipool.events.Len())
	mbCandidate, err := view.makeMiniblockCandidate(ctx, params, mbProposalFromProto(resp.Proposal))
	require.NoError(t, err)
	assert.Nil(t, mbCandidate.headerEvent.Event.GetMiniblockHeader().Snapshot)

	// add another join event
	join3, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, common.Address{}, nil, nil),
		view.LastBlock().Ref,
	)
	assert.NoError(t, err)
	nextEvent = parsedEvent(t, join3)
	assert.NoError(t, err)
	err = view.ValidateNextEvent(ctx, cfg, nextEvent, time.Now())
	assert.NoError(t, err)
	view, err = view.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)
	// with two new events, we should snapshot
	assert.Equal(t, true, view.shouldSnapshot(cfg))
	assert.Equal(t, 1, len(view.blocks))
	assert.Equal(t, 2, len(view.blocks[0].Events()))

	// and miniblocks should have non - nil snapshots
	resp, err = view.ProposeNextMiniblock(ctx, cfg, &ProposeMiniblockRequest{
		StreamId:          streamId[:],
		NewMiniblockNum:   view.minipool.generation,
		PrevMiniblockHash: view.LastBlock().Ref.Hash[:],
		LocalEventHashes:  view.minipool.eventHashesAsBytes(),
	})
	require.NoError(t, err)
	require.Len(t, resp.MissingEvents, 0)
	mbCandidate, err = view.makeMiniblockCandidate(ctx, params, mbProposalFromProto(resp.Proposal))
	require.NoError(t, err)
	miniblockHeader = mbCandidate.headerEvent.Event.GetMiniblockHeader()
	assert.Nil(t, miniblockHeader.Snapshot)
	assert.NotEmpty(t, miniblockHeader.SnapshotHash)

	// check count2
	count2 := 0
	err = view.forEachEvent(0, func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		assert.Equal(t, int64(count2), eventNum)
		if count2 < 3 {
			assert.Equal(t, int64(0), minibockNum)
		} else {
			assert.Equal(t, int64(1), minibockNum)
		}
		count2++
		return true, nil
	})
	assert.NoError(t, err)
	assert.Equal(t, int64(3), miniblockHeader.EventNumOffset) // 3 events in the genisis miniblock
	assert.Equal(t, 2, len(miniblockHeader.EventHashes))      // 2 join events added in test
	assert.Equal(t, 5, count2)                                // we should iterate over all of them

	// test copy and apply block
	// how many blocks do we currently have?
	assert.Equal(t, len(view.blocks), 1)
	// with 5 generations (5 blocks kept in memory)
	newSV1, newEvents, err := view.copyAndApplyBlock(mbCandidate, cfg)
	assert.NoError(t, err)
	assert.Equal(t, len(newSV1.blocks), 2) // we should have both blocks in memory
	assert.Empty(t, newEvents)

	// with 0 generations (0 in memory block history)
	cfg.RecencyConstraintsGen = 0
	newSV2, newEvents, err := view.copyAndApplyBlock(mbCandidate, cfg)
	assert.NoError(t, err)
	assert.Equal(t, len(newSV2.blocks), 1) // we should only have the latest block in memory
	assert.Empty(t, newEvents)
	// add an event with an old hash
	join4, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Membership(MembershipOp_SO_LEAVE, streamId, common.Address{}, nil, nil),
		newSV1.blocks[0].Ref,
	)
	assert.NoError(t, err)
	nextEvent = parsedEvent(t, join4)
	assert.NoError(t, err)
	err = newSV1.ValidateNextEvent(ctx, cfg, nextEvent, time.Now())
	assert.NoError(t, err)
	_, err = newSV1.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)
	// wait 2 second
	time.Sleep(2 * time.Second)

	// try with tighter recency constraints
	cfg.RecencyConstraintsGen = 5
	cfg.RecencyConstraintsAge = 1 * time.Second

	err = newSV1.ValidateNextEvent(ctx, cfg, nextEvent, time.Now())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "BAD_PREV_MINIBLOCK_HASH")
}

func toBytes(t *testing.T, mb *MiniblockInfo) []byte {
	storageMb, err := mb.AsStorageMb()
	require.NoError(t, err)
	return storageMb.Data
}

func TestMbHashConstraints(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	require := require.New(t)
	userWallet, _ := crypto.NewWallet(ctx)
	nodeWallet, _ := crypto.NewWallet(ctx)
	streamId := UserSettingStreamIdFromAddr(userWallet.Address)

	timeNow := time.Now()
	var mbDescriptors []*storage.MiniblockDescriptor
	var mbs []*MiniblockInfo

	genMb := MakeGenesisMiniblockForUserSettingsStream(t, userWallet, nodeWallet, streamId)
	mbDescriptors = append(mbDescriptors, &storage.MiniblockDescriptor{
		Number: genMb.Header().MiniblockNum,
		Data:   toBytes(t, genMb),
	})
	mbs = append(mbs, genMb)

	prevMb := genMb
	for range 10 {
		mb := MakeTestBlockForUserSettingsStream(t, userWallet, nodeWallet, prevMb)
		mbDescriptors = append(mbDescriptors, &storage.MiniblockDescriptor{
			Number: mb.Header().MiniblockNum,
			Data:   toBytes(t, mb),
		})
		mbs = append(mbs, mb)
		prevMb = mb
	}

	cfg := crypto.DefaultOnChainSettings()

	view, err := MakeStreamView(
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: mbDescriptors,
		},
	)
	require.NoError(err)

	for i, mb := range mbs {
		err = view.ValidateNextEvent(
			ctx,
			cfg,
			MakeEvent(
				t,
				userWallet,
				Make_UserSettingsPayload_FullyReadMarkers(&UserSettingsPayload_FullyReadMarkers{}),
				false,
				mb.Ref,
			),
			timeNow,
		)
		// TODO: this should only be 5 last blocks
		require.NoError(err, "Any block recent enough should be good %d", i)
	}

	for i, mb := range mbs {
		err = view.ValidateNextEvent(
			ctx,
			cfg,
			MakeEvent(
				t,
				userWallet,
				Make_UserSettingsPayload_FullyReadMarkers(&UserSettingsPayload_FullyReadMarkers{}),
				false,
				mb.Ref,
			),
			timeNow.Add(60*time.Second),
		)
		// only 2 last blocks are good enough if all blocks are old.
		if i <= 9 {
			require.Error(err, "Shouldn't be able to add with too old block %d", i)
			require.EqualValues(AsRiverError(err).Code, Err_BAD_PREV_MINIBLOCK_HASH)
		} else {
			require.NoError(err, "Should be able to add with last block ref %d", i)
		}
	}

	newMb := MakeTestBlockForUserSettingsStream(t, userWallet, nodeWallet, prevMb)
	err = view.ValidateNextEvent(
		ctx,
		cfg,
		MakeEvent(
			t,
			userWallet,
			Make_UserSettingsPayload_FullyReadMarkers(&UserSettingsPayload_FullyReadMarkers{}),
			false,
			newMb.Ref,
		),
		timeNow,
	)
	require.Error(err)
	require.EqualValues(AsRiverError(err).Code, Err_MINIBLOCK_TOO_NEW)
}

func TestGetResetStreamAndCookieSnapshotIndex(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	
	userWallet, _ := crypto.NewWallet(ctx)
	nodeWallet, _ := crypto.NewWallet(ctx)
	
	streamId := UserStreamIdFromAddr(userWallet.Address)
	
	// Create a genesis miniblock using the helper function
	inception, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	assert.NoError(t, err)
	
	join, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, common.Address{}, nil, nil),
		nil,
	)
	assert.NoError(t, err)
	
	genesisEvents := []*ParsedEvent{parsedEvent(t, inception), parsedEvent(t, join)}
	genesisMb, err := MakeGenesisMiniblock(userWallet, genesisEvents)
	assert.NoError(t, err)
	
	// Parse the genesis miniblock to extract info
	genesisParsed, err := NewMiniblockInfoFromProto(genesisMb, nil, NewParsedMiniblockInfoOpts())
	assert.NoError(t, err)
	assert.Equal(t, int64(0), genesisParsed.Header().MiniblockNum)
	
	// For testing, we'll create blocks without snapshots except at position 2
	// This requires creating new events that don't have the snapshot flag
	
	// For this test, we need to create miniblocks where only block 2 has a snapshot
	// Block 0 will be a genesis block with embedded snapshot (legacy format)
	header0 := &MiniblockHeader{
		MiniblockNum: int64(0),
		Timestamp:    genesisParsed.Header().GetTimestamp(),
		EventHashes:  genesisParsed.Header().GetEventHashes(),
		Content: &MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
		// Genesis blocks use legacy format with embedded snapshot
		Snapshot: genesisParsed.Header().GetSnapshot(),
	}
	
	headerProto0, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_MiniblockHeader(header0),
		nil,
	)
	assert.NoError(t, err)
	
	miniblock0 := &Miniblock{
		Header: headerProto0,
		Events: []*Envelope{inception, join},
	}
	
	miniblockProtoBytes0, err := proto.Marshal(miniblock0)
	assert.NoError(t, err)
	
	// Create miniblocks for positions 1-4
	var miniblockBytes [][]byte
	miniblockBytes = append(miniblockBytes, miniblockProtoBytes0) // Block 0 without snapshot
	
	// Variable to store snapshot data
	var snapshotBytes2 []byte
	
	for i := 1; i < 5; i++ {
		header := &MiniblockHeader{
			MiniblockNum: int64(i),
			Timestamp:    genesisParsed.Header().GetTimestamp(),
			EventHashes:  genesisParsed.Header().GetEventHashes(),
			Content: &MiniblockHeader_None{
				None: &emptypb.Empty{},
			},
		}
		
		// Add snapshot at position 2
		var snapshotData []byte
		if i == 2 {
			// Create snapshot envelope
			snapshot := genesisParsed.Header().GetSnapshot()
			snapshotEnv, err := MakeSnapshotEnvelope(userWallet, snapshot)
			assert.NoError(t, err)
			snapshotData, err = proto.Marshal(snapshotEnv)
			assert.NoError(t, err)
			
			// For new format, store hash in header instead of snapshot
			header.SnapshotHash = snapshotEnv.Hash
		}
		
		headerProto, err := MakeEnvelopeWithPayload(
			userWallet,
			Make_MiniblockHeader(header),
			nil,
		)
		assert.NoError(t, err)
		
		miniblock := &Miniblock{
			Header: headerProto,
			Events: []*Envelope{inception, join},
		}
		
		miniblockProtoBytes, err := proto.Marshal(miniblock)
		assert.NoError(t, err)
		miniblockBytes = append(miniblockBytes, miniblockProtoBytes)
		
		// Store snapshot data for block 2
		if i == 2 {
			snapshotBytes2 = snapshotData
		}
	}
	
	// Test case 1: Create view with multiple miniblocks
	view, err := MakeStreamView(
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: []*storage.MiniblockDescriptor{
				{Data: miniblockBytes[0], Number: 0},
				{Data: miniblockBytes[1], Number: 1},
				{Data: miniblockBytes[2], Snapshot: snapshotBytes2, Number: 2}, // Snapshot at index 2
				{Data: miniblockBytes[3], Number: 3},
				{Data: miniblockBytes[4], Number: 4},
			},
			SnapshotMiniblockOffset: 2,
		},
	)
	assert.NoError(t, err)
	
	
	// Test GetResetStreamAndCookie (old method - should always return 0)
	streamAndCookie1 := view.GetResetStreamAndCookie(nodeWallet.Address)
	assert.Equal(t, int64(0), streamAndCookie1.SnapshotMiniblockIndex) // Always 0 with old method
	assert.Equal(t, 3, len(streamAndCookie1.Miniblocks)) // Only blocks from snapshot onwards
	assert.NotNil(t, streamAndCookie1.Snapshot)
	assert.True(t, streamAndCookie1.SyncReset)
	
	// Test GetResetStreamAndCookieWithPrecedingMiniblocks with 0 preceding blocks
	streamAndCookie2 := view.GetResetStreamAndCookieWithPrecedingMiniblocks(nodeWallet.Address, 0)
	assert.Equal(t, int64(0), streamAndCookie2.SnapshotMiniblockIndex) // 0 when no preceding blocks requested
	assert.Equal(t, 3, len(streamAndCookie2.Miniblocks)) // Blocks from snapshot onwards
	assert.NotNil(t, streamAndCookie2.Snapshot)
	
	// Test GetResetStreamAndCookieWithPrecedingMiniblocks with 1 preceding block
	streamAndCookie3 := view.GetResetStreamAndCookieWithPrecedingMiniblocks(nodeWallet.Address, 1)
	assert.Equal(t, int64(1), streamAndCookie3.SnapshotMiniblockIndex) // Snapshot now at index 1
	assert.Equal(t, 4, len(streamAndCookie3.Miniblocks)) // One extra block before snapshot
	assert.NotNil(t, streamAndCookie3.Snapshot)
	
	// Test GetResetStreamAndCookieWithPrecedingMiniblocks with 2 preceding blocks
	streamAndCookie4 := view.GetResetStreamAndCookieWithPrecedingMiniblocks(nodeWallet.Address, 2)
	assert.Equal(t, int64(2), streamAndCookie4.SnapshotMiniblockIndex) // Snapshot now at index 2
	assert.Equal(t, 5, len(streamAndCookie4.Miniblocks)) // All blocks included
	assert.NotNil(t, streamAndCookie4.Snapshot)
	
	// Test GetResetStreamAndCookieWithPrecedingMiniblocks with more blocks than available
	streamAndCookie5 := view.GetResetStreamAndCookieWithPrecedingMiniblocks(nodeWallet.Address, 10)
	assert.Equal(t, int64(2), streamAndCookie5.SnapshotMiniblockIndex) // Still at index 2 (all available)
	assert.Equal(t, 5, len(streamAndCookie5.Miniblocks)) // All blocks included
	assert.NotNil(t, streamAndCookie5.Snapshot)
	
	// Test edge cases for overflow/underflow protection
	
	// Test with negative number of preceding blocks
	streamAndCookie6 := view.GetResetStreamAndCookieWithPrecedingMiniblocks(nodeWallet.Address, -5)
	assert.Equal(t, int64(0), streamAndCookie6.SnapshotMiniblockIndex) // Should be treated as 0
	assert.Equal(t, 3, len(streamAndCookie6.Miniblocks)) // Same as no preceding blocks
	assert.NotNil(t, streamAndCookie6.Snapshot)
	
	// Test with very large number (potential overflow)
	streamAndCookie7 := view.GetResetStreamAndCookieWithPrecedingMiniblocks(nodeWallet.Address, int64(^uint64(0)>>1)) // Max int64
	assert.Equal(t, int64(2), streamAndCookie7.SnapshotMiniblockIndex) // Should handle gracefully
	assert.Equal(t, 5, len(streamAndCookie7.Miniblocks)) // All blocks included
	assert.NotNil(t, streamAndCookie7.Snapshot)
	
	// Test with empty view (edge case)
	// Use the actual genesis miniblock which has a snapshot embedded (legacy format)
	genesisMbBytes, err := proto.Marshal(genesisMb)
	assert.NoError(t, err)
	
	emptyView, err := MakeStreamView(
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: []*storage.MiniblockDescriptor{
				{Data: genesisMbBytes, Number: 0}, // No external snapshot for genesis blocks
			},
			SnapshotMiniblockOffset: 0,
		},
	)
	assert.NoError(t, err)
	
	streamAndCookie8 := emptyView.GetResetStreamAndCookieWithPrecedingMiniblocks(nodeWallet.Address, 5)
	assert.Equal(t, int64(0), streamAndCookie8.SnapshotMiniblockIndex)
	assert.Equal(t, 1, len(streamAndCookie8.Miniblocks))
	// For genesis blocks with legacy format, snapshot envelope is nil
	assert.Nil(t, streamAndCookie8.Snapshot)
}
