package events

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
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
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, nil, nil),
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

	view, err := MakeStreamView(&storage.ReadStreamFromLastSnapshotResult{
		Miniblocks: [][]byte{miniblockProtoBytes},
	})

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
	assert.Equal(t, int64(0), cookie.MinipoolSlot)

	// Check minipool, should be empty
	assert.Equal(t, 0, len(view.minipool.events.Values))

	btc, err := crypto.NewBlockchainTestContext(ctx, 0, true)
	require.NoError(t, err)

	// check for invalid config
	num, err := btc.OnChainConfig.GetMinEventsPerSnapshot(0x00)
	require.NoError(t, err)
	assert.Equal(t, num, 100) // hard coded default

	// check snapshot generation
	assert.Equal(t, false, view.shouldSnapshot(ctx, btc.OnChainConfig))

	setStreamMinEventsPerSnapshot := func(key crypto.ChainKey, value int) {
		blockNumber := btc.BlockNum(ctx)
		require.NoError(t, err)

		pendingTx, err := btc.DeployerBlockchain.TxPool.Submit(
			ctx, "SetConfiguration", func(opts *bind.TransactOpts) (*types.Transaction, error) {
				v := crypto.ABIEncodeInt64(int64(value))
				return btc.Configuration.SetConfiguration(opts, key.ID(), blockNumber.AsUint64(), v)
			})
		require.NoError(t, err)
		receipt := <-pendingTx.Wait()
		require.Equal(t, crypto.TransactionResultSuccess, receipt.Status)

		// wait for chain monitor to pick up the new configuration setting and apply them
		for {
			currentSetting, err := btc.OnChainConfig.GetInt(key)
			require.NoError(t, err)
			if currentSetting == value {
				return
			}
			time.Sleep(10 * time.Millisecond)
		}
	}

	// check per stream snapshot generation
	setStreamMinEventsPerSnapshot(crypto.StreamMinEventsPerSnapshotUserConfigKey, 2)
	assert.Equal(t, false, view.shouldSnapshot(ctx, btc.OnChainConfig))

	blockHash := view.LastBlock().Hash

	// add one more event (just join again)
	join2, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, nil, nil),
		blockHash[:],
	)
	assert.NoError(t, err)
	nextEvent := parsedEvent(t, join2)
	err = view.ValidateNextEvent(ctx, btc.OnChainConfig, nextEvent, time.Now())
	assert.NoError(t, err)
	view, err = view.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)

	// with one new event, we shouldn't snapshot yet
	assert.Equal(t, false, view.shouldSnapshot(ctx, btc.OnChainConfig))

	// and miniblocks should have nil snapshots
	proposal, _ := view.ProposeNextMiniblock(ctx, btc.OnChainConfig, false)
	miniblockHeader, _, _ = view.makeMiniblockHeader(ctx, proposal)
	assert.Nil(t, miniblockHeader.Snapshot)

	// add another join event
	join3, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, nil, nil),
		view.LastBlock().Hash[:],
	)
	assert.NoError(t, err)
	nextEvent = parsedEvent(t, join3)
	assert.NoError(t, err)
	err = view.ValidateNextEvent(ctx, btc.OnChainConfig, nextEvent, time.Now())
	assert.NoError(t, err)
	view, err = view.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)
	// with two new events, we should snapshot
	assert.Equal(t, true, view.shouldSnapshot(ctx, btc.OnChainConfig))
	assert.Equal(t, 1, len(view.blocks))
	assert.Equal(t, 2, len(view.blocks[0].events))
	// and miniblocks should have non - nil snapshots

	proposal, _ = view.ProposeNextMiniblock(ctx, btc.OnChainConfig, false)
	miniblockHeader, envelopes, _ := view.makeMiniblockHeader(ctx, proposal)
	assert.NotNil(t, miniblockHeader.Snapshot)

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
	// create a new block
	miniblockHeaderEvent, err := MakeParsedEventWithPayload(
		userWallet,
		Make_MiniblockHeader(miniblockHeader),
		view.LastBlock().Hash[:],
	)
	assert.NoError(t, err)
	miniblock, err := NewMiniblockInfoFromParsed(miniblockHeaderEvent, envelopes)
	assert.NoError(t, err)
	// with 5 generations (5 blocks kept in memory)
	newSV1, err := view.copyAndApplyBlock(miniblock, btc.OnChainConfig)
	assert.NoError(t, err)
	assert.Equal(t, len(newSV1.blocks), 2) // we should have both blocks in memory

	pendingTx, err := btc.DeployerBlockchain.TxPool.Submit(ctx, "SetConfiguration", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		blockNum := btc.BlockNum(ctx)
		return btc.Configuration.SetConfiguration(
			opts, crypto.StreamRecencyConstraintsGenerationsConfigKey.ID(), blockNum.AsUint64(), crypto.ABIEncodeInt64(int64(0)))
	})
	require.NoError(t, err)
	receipt := <-pendingTx.Wait()
	require.Equal(t, crypto.TransactionResultSuccess, receipt.Status)
	// wait for the chain monitor to apply the config change in the on chain configuration
	for {
		val, err := btc.OnChainConfig.GetInt(crypto.StreamRecencyConstraintsGenerationsConfigKey)
		require.NoError(t, err)
		if val == 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	// with 0 generations (0 in memory block history)
	newSV2, err := view.copyAndApplyBlock(miniblock, btc.OnChainConfig)
	assert.NoError(t, err)
	assert.Equal(t, len(newSV2.blocks), 1) // we should only have the latest block in memory
	// add an event with an old hash
	join4, err := MakeEnvelopeWithPayload(
		userWallet,
		Make_UserPayload_Membership(MembershipOp_SO_LEAVE, streamId, nil, nil),
		newSV1.blocks[0].Hash[:],
	)
	assert.NoError(t, err)
	nextEvent = parsedEvent(t, join4)
	assert.NoError(t, err)
	err = newSV1.ValidateNextEvent(ctx, btc.OnChainConfig, nextEvent, time.Now())
	assert.NoError(t, err)
	_, err = newSV1.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)
	// wait 2 second
	time.Sleep(2 * time.Second)
	// try with tighter recency constraints
	setOnChainStreamConfig(ctx, btc, testParams{
		recencyConstraintsGenerations: 5,
		recencyConstraintsAgeSec:      1,
	})

	err = newSV1.ValidateNextEvent(ctx, btc.OnChainConfig, nextEvent, time.Now())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "BAD_PREV_MINIBLOCK_HASH")
}
