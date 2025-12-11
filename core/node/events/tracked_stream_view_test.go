package events

import (
	"context"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

// trackedStreamViewTestContext holds common test fixtures
type trackedStreamViewTestContext struct {
	ctx        context.Context
	t          *testing.T
	require    *require.Assertions
	userWallet *crypto.Wallet
	nodeWallet *crypto.Wallet
	streamId   StreamId
	cfg        crypto.OnChainConfiguration

	// Tracked view under test
	trackedView *TrackedStreamViewImpl

	// Event tracking
	receivedEvents []*ParsedEvent
}

func setupTrackedStreamViewTest(t *testing.T) *trackedStreamViewTestContext {
	ctx := test.NewTestContext(t)
	userWallet, _ := crypto.NewWallet(ctx)
	nodeWallet, _ := crypto.NewWallet(ctx)
	cfg := &mocks.MockOnChainCfg{Settings: crypto.DefaultOnChainSettings()}
	streamId := UserStreamIdFromAddr(userWallet.Address)

	tc := &trackedStreamViewTestContext{
		ctx:            ctx,
		t:              t,
		require:        require.New(t),
		userWallet:     userWallet,
		nodeWallet:     nodeWallet,
		streamId:       streamId,
		cfg:            cfg,
		receivedEvents: make([]*ParsedEvent, 0),
	}

	return tc
}

// initTrackedView initializes the tracked view with a genesis block
func (tc *trackedStreamViewTestContext) initTrackedView() *StreamView {
	// Create genesis events
	inception, err := MakeEnvelopeWithPayload(
		tc.userWallet,
		Make_UserPayload_Inception(tc.streamId, nil),
		nil,
	)
	tc.require.NoError(err)

	join, err := MakeEnvelopeWithPayload(
		tc.userWallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, tc.streamId, common.Address{}, nil),
		nil,
	)
	tc.require.NoError(err)

	// Create genesis miniblock
	genesisMb, err := MakeGenesisMiniblock(tc.userWallet, []*ParsedEvent{
		tc.parseEvent(inception),
		tc.parseEvent(join),
	})
	tc.require.NoError(err)

	// Create StreamAndCookie for initialization
	stream := &StreamAndCookie{
		NextSyncCookie: &SyncCookie{
			StreamId:    tc.streamId[:],
			MinipoolGen: 1,
		},
		Miniblocks: []*Miniblock{genesisMb},
	}

	// Initialize tracked view
	tc.trackedView = &TrackedStreamViewImpl{}
	view, err := tc.trackedView.Init(
		tc.streamId,
		tc.cfg,
		stream,
		tc.onNewEvent,
		nil, // no cookie persistence
	)
	tc.require.NoError(err)

	return view
}

// onNewEvent callback that records received events
func (tc *trackedStreamViewTestContext) onNewEvent(ctx context.Context, view *StreamView, event *ParsedEvent) error {
	tc.receivedEvents = append(tc.receivedEvents, event)
	return nil
}

// parseEvent parses an envelope into a ParsedEvent
func (tc *trackedStreamViewTestContext) parseEvent(envelope *Envelope) *ParsedEvent {
	parsed, err := ParseEvent(envelope)
	tc.require.NoError(err)
	return parsed
}

// createMembershipEvent creates a membership event (join/leave)
func (tc *trackedStreamViewTestContext) createMembershipEvent(op MembershipOp) *Envelope {
	envelope, err := MakeEnvelopeWithPayload(
		tc.userWallet,
		Make_UserPayload_Membership(op, tc.streamId, common.Address{}, nil),
		tc.trackedView.view.LastBlock().Ref,
	)
	tc.require.NoError(err)
	return envelope
}

// createMiniblockHeader creates a miniblock header event for the given events
func (tc *trackedStreamViewTestContext) createMiniblockHeader(events []*ParsedEvent) *Envelope {
	lastBlock := tc.trackedView.view.LastBlock()

	// Build event hashes
	eventHashes := make([][]byte, len(events))
	for i, e := range events {
		eventHashes[i] = e.Hash[:]
	}

	header := &MiniblockHeader{
		MiniblockNum:      lastBlock.Ref.Num + 1,
		Timestamp:         NextMiniblockTimestamp(lastBlock.Header().Timestamp),
		EventHashes:       eventHashes,
		PrevMiniblockHash: lastBlock.Ref.Hash[:],
		EventNumOffset:    lastBlock.Header().EventNumOffset + int64(len(lastBlock.Header().EventHashes)) + 1,
	}

	envelope, err := MakeEnvelopeWithPayload(
		tc.nodeWallet,
		Make_MiniblockHeader(header),
		lastBlock.Ref,
	)
	tc.require.NoError(err)
	return envelope
}

// minipoolSize returns the current minipool size
func (tc *trackedStreamViewTestContext) minipoolSize() int {
	return tc.trackedView.view.minipool.events.Len()
}

// TestTrackedStreamView_Init tests initialization of TrackedStreamViewImpl
func TestTrackedStreamView_Init(t *testing.T) {
	tc := setupTrackedStreamViewTest(t)
	view := tc.initTrackedView()

	assert.NotNil(t, view)
	assert.Equal(t, tc.streamId, *view.StreamId())
	assert.Equal(t, 0, tc.minipoolSize(), "minipool should be empty after init")
	assert.Empty(t, tc.receivedEvents, "no events should be received during init")
}

// TestTrackedStreamView_ApplyEvent_RegularEvent tests adding regular events
func TestTrackedStreamView_ApplyEvent_RegularEvent(t *testing.T) {
	tc := setupTrackedStreamViewTest(t)
	tc.initTrackedView()

	// Add a regular event
	event := tc.createMembershipEvent(MembershipOp_SO_JOIN)
	err := tc.trackedView.ApplyEvent(tc.ctx, event)
	tc.require.NoError(err)

	// Verify event was added to minipool
	assert.Equal(t, 1, tc.minipoolSize())

	// Verify callback was invoked
	assert.Len(t, tc.receivedEvents, 1)
	assert.Equal(t, common.BytesToHash(event.Hash), tc.receivedEvents[0].Hash)
}

// TestTrackedStreamView_ApplyEvent_DuplicateEvent tests that duplicate events are skipped
func TestTrackedStreamView_ApplyEvent_DuplicateEvent(t *testing.T) {
	tc := setupTrackedStreamViewTest(t)
	tc.initTrackedView()

	// Add an event
	event := tc.createMembershipEvent(MembershipOp_SO_JOIN)
	err := tc.trackedView.ApplyEvent(tc.ctx, event)
	tc.require.NoError(err)

	// Try to add the same event again
	err = tc.trackedView.ApplyEvent(tc.ctx, event)
	tc.require.NoError(err)

	// Verify only one event in minipool
	assert.Equal(t, 1, tc.minipoolSize())

	// Verify callback was only invoked once
	assert.Len(t, tc.receivedEvents, 1)
}

// TestTrackedStreamView_ApplyEvent_MiniblockHeader tests that miniblock headers prune the minipool
func TestTrackedStreamView_ApplyEvent_MiniblockHeader(t *testing.T) {
	tc := setupTrackedStreamViewTest(t)
	tc.initTrackedView()

	// Add multiple events to the minipool
	event1 := tc.createMembershipEvent(MembershipOp_SO_JOIN)
	err := tc.trackedView.ApplyEvent(tc.ctx, event1)
	tc.require.NoError(err)

	event2 := tc.createMembershipEvent(MembershipOp_SO_LEAVE)
	err = tc.trackedView.ApplyEvent(tc.ctx, event2)
	tc.require.NoError(err)

	assert.Equal(t, 2, tc.minipoolSize(), "minipool should have 2 events")

	// Create and apply a miniblock header that includes these events
	parsedEvents := []*ParsedEvent{tc.parseEvent(event1), tc.parseEvent(event2)}
	headerEnvelope := tc.createMiniblockHeader(parsedEvents)

	err = tc.trackedView.ApplyEvent(tc.ctx, headerEnvelope)
	tc.require.NoError(err)

	// Verify minipool was pruned
	assert.Equal(t, 0, tc.minipoolSize(), "minipool should be empty after applying header")

	// Verify callback was NOT invoked for the header (only for the 2 events)
	assert.Len(t, tc.receivedEvents, 2)

	// Verify block was applied
	assert.Equal(t, int64(1), tc.trackedView.view.LastBlock().Ref.Num)
}

// TestTrackedStreamView_ApplyEvent_MiniblockHeader_PartialPrune tests pruning with only some events in minipool
func TestTrackedStreamView_ApplyEvent_MiniblockHeader_PartialPrune(t *testing.T) {
	tc := setupTrackedStreamViewTest(t)
	tc.initTrackedView()

	// Add one event
	event1 := tc.createMembershipEvent(MembershipOp_SO_JOIN)
	err := tc.trackedView.ApplyEvent(tc.ctx, event1)
	tc.require.NoError(err)

	// Create header that references the event (simulating we received the header
	// but the client might not have all events - this tests the partial matching)
	parsedEvents := []*ParsedEvent{tc.parseEvent(event1)}
	headerEnvelope := tc.createMiniblockHeader(parsedEvents)

	// Add another event AFTER header was created (simulating late arrival)
	event2 := tc.createMembershipEvent(MembershipOp_SO_LEAVE)
	err = tc.trackedView.ApplyEvent(tc.ctx, event2)
	tc.require.NoError(err)

	assert.Equal(t, 2, tc.minipoolSize())

	// Apply the header - should only prune event1, leaving event2
	err = tc.trackedView.ApplyEvent(tc.ctx, headerEnvelope)
	tc.require.NoError(err)

	// event2 should still be in minipool (it wasn't in the block)
	assert.Equal(t, 1, tc.minipoolSize())
}

// TestTrackedStreamView_ApplyBlock tests applying a full miniblock
func TestTrackedStreamView_ApplyBlock(t *testing.T) {
	tc := setupTrackedStreamViewTest(t)
	tc.initTrackedView()

	// Add events to minipool
	event1 := tc.createMembershipEvent(MembershipOp_SO_JOIN)
	err := tc.trackedView.ApplyEvent(tc.ctx, event1)
	tc.require.NoError(err)

	assert.Equal(t, 1, tc.minipoolSize())

	// Create a full miniblock (with header and events)
	parsedEvent1 := tc.parseEvent(event1)
	lastBlock := tc.trackedView.view.LastBlock()

	header := &MiniblockHeader{
		MiniblockNum:      lastBlock.Ref.Num + 1,
		Timestamp:         NextMiniblockTimestamp(lastBlock.Header().Timestamp),
		EventHashes:       [][]byte{parsedEvent1.Hash[:]},
		PrevMiniblockHash: lastBlock.Ref.Hash[:],
		EventNumOffset:    lastBlock.Header().EventNumOffset + int64(len(lastBlock.Header().EventHashes)) + 1,
	}

	headerEnvelope, err := MakeEnvelopeWithPayload(
		tc.nodeWallet,
		Make_MiniblockHeader(header),
		lastBlock.Ref,
	)
	tc.require.NoError(err)

	miniblock := &Miniblock{
		Header: headerEnvelope,
		Events: []*Envelope{event1},
	}

	// Apply the block
	err = tc.trackedView.ApplyBlock(miniblock, nil)
	tc.require.NoError(err)

	// Verify minipool was pruned
	assert.Equal(t, 0, tc.minipoolSize())

	// Verify block was applied
	assert.Equal(t, int64(1), tc.trackedView.view.LastBlock().Ref.Num)
}

// TestTrackedStreamView_ApplyBlock_DuplicateBlock tests that duplicate blocks are skipped
func TestTrackedStreamView_ApplyBlock_DuplicateBlock(t *testing.T) {
	tc := setupTrackedStreamViewTest(t)
	tc.initTrackedView()

	// Add and apply a block via header event
	event1 := tc.createMembershipEvent(MembershipOp_SO_JOIN)
	err := tc.trackedView.ApplyEvent(tc.ctx, event1)
	tc.require.NoError(err)

	parsedEvents := []*ParsedEvent{tc.parseEvent(event1)}
	headerEnvelope := tc.createMiniblockHeader(parsedEvents)

	err = tc.trackedView.ApplyEvent(tc.ctx, headerEnvelope)
	tc.require.NoError(err)

	assert.Equal(t, int64(1), tc.trackedView.view.LastBlock().Ref.Num)

	// Try to apply a block with block number <= current (should be skipped)
	// We need to create a valid miniblock structure
	miniblock := &Miniblock{
		Header: headerEnvelope,
		Events: []*Envelope{event1},
	}

	// This should be a no-op (duplicate block number)
	blockNumBefore := tc.trackedView.view.LastBlock().Ref.Num
	err = tc.trackedView.ApplyBlock(miniblock, nil)
	tc.require.NoError(err)

	// Block number should not change
	assert.Equal(t, blockNumBefore, tc.trackedView.view.LastBlock().Ref.Num)
}

// TestTrackedStreamView_SendEventNotification tests the notification method
func TestTrackedStreamView_SendEventNotification(t *testing.T) {
	tc := setupTrackedStreamViewTest(t)
	tc.initTrackedView()

	// Create an event (don't apply it, just send notification)
	event := tc.createMembershipEvent(MembershipOp_SO_JOIN)
	parsedEvent := tc.parseEvent(event)

	err := tc.trackedView.SendEventNotification(tc.ctx, parsedEvent)
	tc.require.NoError(err)

	// Verify callback was invoked
	assert.Len(t, tc.receivedEvents, 1)
	assert.Equal(t, parsedEvent.Hash, tc.receivedEvents[0].Hash)

	// Verify minipool is unchanged (event not added)
	assert.Equal(t, 0, tc.minipoolSize())
}

// TestTrackedStreamView_ShouldPersistCookie tests cookie persistence callback
func TestTrackedStreamView_ShouldPersistCookie(t *testing.T) {
	t.Run("nil callback returns false", func(t *testing.T) {
		tc := setupTrackedStreamViewTest(t)
		tc.initTrackedView()

		assert.False(t, tc.trackedView.ShouldPersistCookie(tc.ctx))
	})

	t.Run("callback is invoked", func(t *testing.T) {
		tc := setupTrackedStreamViewTest(t)

		// Create genesis block
		inception, err := MakeEnvelopeWithPayload(
			tc.userWallet,
			Make_UserPayload_Inception(tc.streamId, nil),
			nil,
		)
		tc.require.NoError(err)

		genesisMb, err := MakeGenesisMiniblock(tc.userWallet, []*ParsedEvent{tc.parseEvent(inception)})
		tc.require.NoError(err)

		stream := &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId:    tc.streamId[:],
				MinipoolGen: 1,
			},
			Miniblocks: []*Miniblock{genesisMb},
		}

		// Initialize with a shouldPersistCookie callback that returns true
		callbackInvoked := false
		tc.trackedView = &TrackedStreamViewImpl{}
		_, err = tc.trackedView.Init(
			tc.streamId,
			tc.cfg,
			stream,
			tc.onNewEvent,
			func(ctx context.Context, view *StreamView) bool {
				callbackInvoked = true
				return true
			},
		)
		tc.require.NoError(err)

		result := tc.trackedView.ShouldPersistCookie(tc.ctx)

		assert.True(t, callbackInvoked)
		assert.True(t, result)
	})
}
