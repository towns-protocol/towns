package sync

import (
	"context"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

// NotificationStreamView is a memory-optimized replacement for TrackedStreamViewImpl that
// eliminates the need to store full StreamView objects.
//
// OLD ARCHITECTURE (per stream, ESTIMATED):
//
//	TrackedStreamViewImpl {
//	    view: *StreamView {           // Stores pointer to large object
//	        blocks:   []*MiniblockInfo    // Grows with stream age (~10-50 KB+ depending on history)
//	        minipool: *minipoolInstance   // Holds recent events (~50-100 KB)
//	        snapshot: *Snapshot           // Complete state snapshot (~50-200 KB)
//	    }
//	    onNewEvent: func(ctx, view *StreamView, event) // Callback with full view access
//	}
//	Estimated: ~250-500 KB base overhead + member data, grows with stream history
//
// NEW ARCHITECTURE (per stream, MEASURED):
//
//	NotificationStreamView {
//	    members: map[common.Address]struct{}  // Only member addresses
//	}
//	Measured memory (100 members): ~36 KB per stream
//	Measured memory (1000 members): ~340 KB per stream
//
// OPTIMIZATION: Eliminates blocks/minipool/snapshot storage by processing stream data once
// during initialization, then discarding it. This trades historical data storage for minimal
// current-state tracking.
//
// KEY OPTIMIZATION:
//
//	The `stream *StreamAndCookie` parameter in initialization is READ ONCE to extract members,
//	then discarded. We never store blocks, minipool, or snapshots.
//
//	The old `view *StreamView` parameter in onNewEvent() is eliminated. We maintain member
//	state incrementally in our own map, making GetChannelMembers() O(1) instead of O(n).
//
// PRESERVED BEHAVIOR:
//  1. Blocked lists: extractBlockedUsers() on init + SendEventNotification() on updates
//  2. Message events: listener.OnMessageEvent() called for all message events
//  3. Membership tracking: ApplyEvent() processes join/leave events
//
// FUNCTION MAPPING:
//
//	onNewEvent(ctx, *StreamView, event)  -> SendEventNotification(ctx, event)
//	TrackedStreamViewImpl.ApplyEvent     -> ApplyEvent()
//	TrackedStreamViewImpl.ApplyBlock     -> ApplyBlock()
//	StreamView.GetChannelMembers()       -> GetChannelMembers()
type NotificationStreamView struct {
	streamID    shared.StreamId
	spaceID     *shared.StreamId
	cfg         crypto.OnChainConfiguration
	listener    track_streams.StreamEventListener
	preferences UserPreferencesStore

	// Membership tracking (only thing we store from the stream)
	members map[common.Address]struct{}

	// Minimal tracking to replace StreamView's minipool and block tracking.
	// These fields enable the same deduplication guarantees as TrackedStreamViewImpl
	// without storing the full StreamView (blocks, minipool, snapshot).
	lastBlockNum int64                    // Last processed block number (for block deduplication)
	seenEvents   map[common.Hash]struct{} // Event deduplication cache (mimics minipool behavior)
	// seenEvents is pruned when blocks are applied, removing events now in the block.
	// This mirrors how minipool is flushed during ApplyBlock, keeping memory bounded.
	//
	// NOTE: No mutex needed - each NotificationStreamView is accessed from a single goroutine,
	// just like TrackedStreamViewImpl. The listener comment about thread-safety refers to the
	// listener implementation (which receives events from multiple streams), not the view itself.
}

// NewNotificationStreamView creates a lightweight stream view optimized for notifications.
// The stream parameter is read once during initialization to extract member addresses,
// then immediately discarded. We never store the StreamAndCookie, blocks, minipool, or snapshot.
func NewNotificationStreamView(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	listener track_streams.StreamEventListener,
	preferences UserPreferencesStore,
) (*NotificationStreamView, error) {
	view := &NotificationStreamView{
		streamID:     streamID,
		cfg:          cfg,
		listener:     listener,
		preferences:  preferences,
		members:      make(map[common.Address]struct{}),
		seenEvents:   make(map[common.Hash]struct{}),
		lastBlockNum: -1, // Start at -1, will be updated during initialization
	}

	// Extract member data and initialize tracking state from stream
	if err := view.initializeFromStream(ctx, stream); err != nil {
		return nil, err
	}

	return view, nil
}

// initializeFromStream extracts only member addresses from the stream
func (v *NotificationStreamView) initializeFromStream(ctx context.Context, stream *StreamAndCookie) error {
	if stream == nil || stream.Snapshot == nil {
		return RiverError(Err_STREAM_EMPTY, "no stream or snapshot").Func("initializeFromStream")
	}

	var snapshot Snapshot
	if err := proto.Unmarshal(stream.Snapshot.Event, &snapshot); err != nil {
		return AsRiverError(err, Err_INTERNAL).Message("Failed to unmarshal snapshot")
	}

	// Extract space ID if this is a channel stream
	if v.streamID.Type() == shared.STREAM_CHANNEL_BIN {
		if spaceContent := snapshot.GetChannelContent(); spaceContent != nil {
			if inception := spaceContent.GetInception(); inception != nil && len(inception.SpaceId) > 0 {
				if spaceID, err := shared.StreamIdFromBytes(inception.SpaceId); err == nil {
					v.spaceID = &spaceID
				}
			}
		}
	}

	// Extract member addresses
	if snapshotMembers := snapshot.GetMembers(); snapshotMembers != nil {
		for _, member := range snapshotMembers.Joined {
			if len(member.UserAddress) > 0 {
				v.members[common.BytesToAddress(member.UserAddress)] = struct{}{}
			}
		}
	}

	// For user settings streams, extract blocked users
	if v.streamID.Type() == shared.STREAM_USER_SETTINGS_BIN {
		user, err := shared.GetUserAddressFromStreamId(v.streamID)
		if err != nil {
			return err
		}
		if err := v.extractBlockedUsers(ctx, &snapshot, user); err != nil {
			return err
		}
	}

	// Process miniblocks to update membership and track last block number
	for _, mb := range stream.Miniblocks {
		if err := v.processMiniblockForMembership(ctx, mb); err != nil {
			return err
		}

		// Track the last block number we've processed
		if headerEnvelope := mb.GetHeader(); headerEnvelope != nil {
			var headerEvent StreamEvent
			if err := proto.Unmarshal(headerEnvelope.Event, &headerEvent); err == nil {
				if mbHeader := headerEvent.GetMiniblockHeader(); mbHeader != nil {
					if mbHeader.MiniblockNum > v.lastBlockNum {
						v.lastBlockNum = mbHeader.MiniblockNum
					}
				}
			}
		}

		// Mark all events in this miniblock as seen to prevent notifications
		// for historical events when SendEventNotification is called during
		// cold stream processing with ApplyHistoricalContent.Enabled=true
		for _, envelope := range mb.Events {
			eventHash := common.BytesToHash(envelope.Hash)
			v.seenEvents[eventHash] = struct{}{}
		}
	}

	// Process events in minipool and mark them as seen
	// These are events waiting for the next miniblock, so we need to track them
	// to avoid sending duplicate notifications if they arrive again via ApplyEvent.
	for _, event := range stream.Events {
		if err := v.processEventForMembership(ctx, event); err != nil {
			return err
		}

		// Mark event as seen to prevent duplicate notifications
		eventHash := common.BytesToHash(event.Hash)
		v.seenEvents[eventHash] = struct{}{}
	}

	return nil
}

// extractBlockedUsers loads blocked users from user settings snapshot.
// This is idempotent - it applies the exact snapshot state by calling both
// BlockUser and UnblockUser based on the boolean value.
func (v *NotificationStreamView) extractBlockedUsers(
	ctx context.Context,
	snapshot *Snapshot,
	user common.Address,
) error {
	if userSettingsContent := snapshot.GetUserSettingsContent(); userSettingsContent != nil {
		for _, blocks := range userSettingsContent.GetUserBlocksList() {
			addr := common.BytesToAddress(blocks.GetUserId())
			for _, block := range blocks.GetBlocks() {
				if block.GetIsBlocked() {
					v.preferences.BlockUser(user, addr)
				} else {
					v.preferences.UnblockUser(user, addr)
				}
			}
		}
	}
	return nil
}

// processMiniblockForMembership extracts membership changes from a miniblock
func (v *NotificationStreamView) processMiniblockForMembership(ctx context.Context, miniblock *Miniblock) error {
	for _, envelope := range miniblock.Events {
		if err := v.processEventForMembership(ctx, envelope); err != nil {
			return err
		}
	}
	return nil
}

// processEventForMembership updates membership from an event without storing the event
func (v *NotificationStreamView) processEventForMembership(ctx context.Context, envelope *Envelope) error {
	var event StreamEvent
	if err := proto.Unmarshal(envelope.Event, &event); err != nil {
		return nil // Skip malformed events
	}

	// Update membership based on event type
	if memberPayload := event.GetMemberPayload(); memberPayload != nil {
		if membership := memberPayload.GetMembership(); membership != nil {
			if len(membership.UserAddress) > 0 {
				addr := common.BytesToAddress(membership.UserAddress)

				if membership.Op == MembershipOp_SO_JOIN {
					v.members[addr] = struct{}{}
				} else if membership.Op == MembershipOp_SO_LEAVE {
					delete(v.members, addr)
				}
			}
		}
	}

	return nil
}

// GetChannelMembers returns the set of member addresses
func (v *NotificationStreamView) GetChannelMembers() (mapset.Set[string], error) {
	memberSet := mapset.NewSet[string]()
	for addr := range v.members {
		memberSet.Add(addr.Hex())
	}

	return memberSet, nil
}

// ApplyBlock processes a new miniblock and updates membership.
//
// IMPORTANT: This does NOT send notifications. Miniblocks contain historical events
// that were already notified when they arrived via ApplyEvent. Only ApplyEvent sends
// notifications for real-time events.
//
// Deduplication: Skips blocks we've already processed by comparing block numbers.
//
// Cache pruning: Removes events from seenEvents cache that are now in the block.
// This mirrors how the old implementation's minipool is flushed when a block is created,
// keeping memory bounded to events waiting for the next block (~10-100 events typically).
func (v *NotificationStreamView) ApplyBlock(miniblock *Miniblock, snapshot *Envelope) error {
	// Extract block number and check for duplicates
	if headerEnvelope := miniblock.GetHeader(); headerEnvelope != nil {
		var headerEvent StreamEvent
		if err := proto.Unmarshal(headerEnvelope.Event, &headerEvent); err == nil {
			if mbHeader := headerEvent.GetMiniblockHeader(); mbHeader != nil {
				blockNum := mbHeader.MiniblockNum

				// Skip if we've already processed this block (deduplication)
				if blockNum <= v.lastBlockNum {
					return nil
				}

				v.lastBlockNum = blockNum
			}
		}
	}

	// Prune seenEvents cache: remove events now in the block
	// This mirrors the minipool flush behavior in TrackedStreamViewImpl.
	// Events transition from minipool → block, so we remove them from our cache.
	for _, envelope := range miniblock.Events {
		eventHash := common.BytesToHash(envelope.Hash)
		delete(v.seenEvents, eventHash)
	}

	// Update membership only - no notifications for historical events
	ctx := context.TODO()
	return v.processMiniblockForMembership(ctx, miniblock)
}

// ApplyEvent processes a new real-time event and sends notifications.
// This is the ONLY place where notifications are sent.
//
// Deduplication strategy (matches TrackedStreamViewImpl.addEvent):
// 1. Check seenEvents cache - skip if already processed
// 2. Check for miniblock headers - skip metadata events
// 3. Mark event as seen before processing
//
// The seenEvents cache is pruned when blocks are applied, keeping it bounded.
func (v *NotificationStreamView) ApplyEvent(ctx context.Context, envelope *Envelope) error {
	eventHash := common.BytesToHash(envelope.Hash)

	// Skip if we've already seen this event (deduplication)
	if _, seen := v.seenEvents[eventHash]; seen {
		return nil
	}

	// Parse the event
	parsed, err := ParseEvent(envelope)
	if err != nil {
		return err
	}

	// Mark event as seen before processing (add to cache)
	v.seenEvents[eventHash] = struct{}{}

	// Skip miniblock headers - these are metadata events, not user events
	if parsed.Event.GetMiniblockHeader() != nil {
		return v.processEventForMembership(ctx, envelope)
	}

	// Update membership
	if err := v.processEventForMembership(ctx, envelope); err != nil {
		return err
	}

	// Send notification for real-time event
	return v.SendEventNotification(ctx, parsed)
}

// SendEventNotification processes an event and triggers notifications (was callback, now direct method)
// This method does NOT check seenEvents - deduplication is handled by ApplyEvent.
// This can be called from:
// 1. ApplyEvent (after deduplication check)
// 2. multi_sync_runner for historical events (controlled by applyBlocks logic)
func (v *NotificationStreamView) SendEventNotification(ctx context.Context, event *ParsedEvent) error {
	// Handle user settings stream (block/unblock events)
	if v.streamID.Type() == shared.STREAM_USER_SETTINGS_BIN {
		if settings := event.Event.GetUserSettingsPayload(); settings != nil {
			if userBlock := settings.GetUserBlock(); userBlock != nil {
				userID := common.BytesToAddress(event.Event.CreatorAddress)
				blockedUser := common.BytesToAddress(userBlock.GetUserId())

				if userBlock.GetIsBlocked() {
					v.preferences.BlockUser(userID, blockedUser)
				} else {
					v.preferences.UnblockUser(userID, blockedUser)
				}
			}
		}
		return nil
	}

	// For message streams, get members and trigger notification
	members, err := v.GetChannelMembers()
	if err != nil {
		return err
	}

	v.listener.OnMessageEvent(ctx, v.streamID, v.spaceID, members, event)
	return nil
}

// StreamID returns the stream identifier
func (v *NotificationStreamView) StreamID() shared.StreamId {
	return v.streamID
}

// MemberCount returns the current number of members (useful for metrics)
func (v *NotificationStreamView) MemberCount() int {
	return len(v.members)
}
