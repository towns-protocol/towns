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

// NotificationStreamView is a memory-optimized replacement for TrackedStreamViewImpl.
// Stores only member addresses instead of full StreamView objects.
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
// Stream data is parsed once during initialization to extract members, then discarded.
// Member state is maintained incrementally via ApplyEvent/ApplyBlock.
//
// FUNCTION MAPPING:
//
//	onNewEvent(ctx, *StreamView, event)  -> SendEventNotification(ctx, event)
//	TrackedStreamViewImpl.ApplyEvent     -> ApplyEvent()
//	TrackedStreamViewImpl.ApplyBlock     -> ApplyBlock()
//	StreamView.GetChannelMembers()       -> GetChannelMembers()
type NotificationStreamView struct {
	streamID    shared.StreamId
	cfg         crypto.OnChainConfiguration
	listener    track_streams.StreamEventListener
	preferences UserPreferencesStore

	// Cached space ID for channel streams to avoid repeated allocations.
	// For STREAM_CHANNEL_BIN, space ID is encoded in streamID bytes 1-21.
	spaceID *shared.StreamId

	members map[common.Address]struct{} // Current membership state

	// Deduplication tracking (replaces StreamView's minipool/block tracking)
	lastBlockNum int64                    // Last processed block number
	seenEvents   map[common.Hash]struct{} // Event cache, pruned when blocks are applied
	// NOTE: No mutex needed - accessed from single goroutine like TrackedStreamViewImpl
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

	// Cache space ID for channel streams to avoid repeated allocations in SendEventNotification
	if streamID.Type() == shared.STREAM_CHANNEL_BIN {
		sid := streamID.SpaceID()
		view.spaceID = &sid
	}

	// Extract member data and initialize tracking state from stream
	if err := view.initializeFromStream(ctx, stream); err != nil {
		return nil, err
	}

	return view, nil
}

// initializeFromStream extracts only member addresses from the stream.
// Uses existing parsing functions (ParseMiniblocksFromProto, ParseEvent) to avoid code duplication.
// The parsed structures (MiniblockInfo, ParsedEvent) are used only to extract minimal data,
// then discarded when this function returns, maintaining memory efficiency.
//
// Equivalent to old TrackedStreamViewImpl which used:
// - node/events/stream_view.go:ParseMiniblocksFromProto for snapshot and miniblocks
// - node/events/parsed_event.go:ParseEvent for events
func (v *NotificationStreamView) initializeFromStream(ctx context.Context, stream *StreamAndCookie) error {
	if stream == nil {
		return RiverError(Err_STREAM_EMPTY, "no stream").Func("initializeFromStream")
	}

	var miniblocks []*MiniblockInfo
	var snapshot *Snapshot

	// Parse snapshot if present to get initial membership state
	if stream.Snapshot != nil {
		// Parse snapshot envelope directly without hash/signature validation
		// Equivalent to: node/events/snapshot.go (ParseSnapshot unmarshal step)
		snapshot = &Snapshot{}
		if err := proto.Unmarshal(stream.Snapshot.Event, snapshot); err != nil {
			return AsRiverError(err, Err_INVALID_ARGUMENT).
				Message("Failed to decode snapshot from bytes").
				Func("initializeFromStream")
		}
	}

	// Parse miniblocks if present (these contain events after the snapshot)
	if len(stream.Miniblocks) > 0 {
		// Use existing ParseMiniblocksFromProto to get validated miniblocks.
		// This handles all the complex parsing, validation, and snapshot extraction logic.
		// Equivalent to: node/events/stream_view.go (MakeRemoteStreamView)
		var parsedSnapshot *Snapshot
		var snapshotIndex int
		var err error
		miniblocks, parsedSnapshot, snapshotIndex, err = ParseMiniblocksFromProto(stream.Miniblocks, stream.Snapshot, nil)
		if err != nil {
			return err
		}
		// Use the snapshot from ParseMiniblocksFromProto if we don't have one yet
		// (this handles edge cases where miniblocks exist but snapshot wasn't parsed above)
		if parsedSnapshot != nil {
			snapshot = parsedSnapshot
			miniblocks = miniblocks[snapshotIndex:]
		}
	}

	// Extract initial stream member list from snapshot
	if snapshot != nil {
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
			if err := v.extractBlockedUsers(snapshot, user); err != nil {
				return err
			}
		}
	}

	// apply user join/leave and block/unblock events in miniblocks that occurred after last snapshot
	// MiniblockInfo.Events() returns []*ParsedEvent - no need to re-parse!
	for _, mbInfo := range miniblocks {
		// Track the last block number (already parsed in mbInfo.Ref)
		if mbInfo.Ref.Num > v.lastBlockNum {
			v.lastBlockNum = mbInfo.Ref.Num
		}

		// Process already-parsed events from MiniblockInfo.Events()
		// Equivalent to: node/events/miniblock_info.go (Events getter)
		for _, parsedEvent := range mbInfo.Events() {
			// Update membership from parsed event
			if err := v.updateMembershipFromEvent(parsedEvent.Event); err != nil {
				return err
			}

			// Mark as seen to prevent notifications for historical events
			v.seenEvents[parsedEvent.Hash] = struct{}{}
		}
	}

	// Process events in minipool using ParseEvent (standard validation).
	// These are events waiting for the next miniblock, so we need to track them
	// to avoid sending duplicate notifications if they arrive again via ApplyEvent.
	// Equivalent to: node/events/stream_view.go (MakeRemoteStreamView minipool processing)
	for _, envelope := range stream.Events {
		// Use ParseEvent for validation (equivalent to old MakeRemoteStreamView)
		parsed, err := ParseEvent(envelope)
		if err != nil {
			return err
		}

		// Update membership from parsed event
		if err := v.updateMembershipFromEvent(parsed.Event); err != nil {
			return err
		}

		// Mark event as seen to prevent duplicate notifications
		v.seenEvents[parsed.Hash] = struct{}{}
	}

	return nil
}

// extractBlockedUsers loads blocked users from user settings snapshot.
// This is idempotent - it applies the exact snapshot state by calling both
// BlockUser and UnblockUser based on the boolean value.
func (v *NotificationStreamView) extractBlockedUsers(
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

// updateMembershipFromEvent extracts and updates membership from a parsed StreamEvent.
// Used after parsing events with ParseEvent (minipool) or from MiniblockInfo.Events() (miniblocks).
func (v *NotificationStreamView) updateMembershipFromEvent(event *StreamEvent) error {
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
	// Parse the miniblock using existing function (equivalent to old TrackedStreamViewImpl.ApplyBlock)
	// Equivalent to: node/events/tracked_stream_view.go
	mbInfo, err := NewMiniblockInfoFromProto(
		miniblock,
		snapshot,
		NewParsedMiniblockInfoOpts().WithApplyOnlyMatchingSnapshot(),
	)
	if err != nil {
		return err
	}

	// Skip if we've already processed this block (deduplication)
	if mbInfo.Ref.Num <= v.lastBlockNum {
		return nil
	}

	v.lastBlockNum = mbInfo.Ref.Num

	// Prune seenEvents cache: remove events now in the block
	// This mirrors the minipool flush behavior in TrackedStreamViewImpl.
	// Events transition from minipool → block, so we remove them from our cache.
	for _, parsedEvent := range mbInfo.Events() {
		delete(v.seenEvents, parsedEvent.Hash)
	}

	// Update membership from already-parsed events - no notifications for historical events
	for _, parsedEvent := range mbInfo.Events() {
		if err := v.updateMembershipFromEvent(parsedEvent.Event); err != nil {
			return err
		}
	}

	return nil
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
		return v.updateMembershipFromEvent(parsed.Event)
	}

	// Update membership from already-parsed event
	if err := v.updateMembershipFromEvent(parsed.Event); err != nil {
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

	// Use cached space ID (computed once during initialization for channel streams)
	v.listener.OnMessageEvent(ctx, v.streamID, v.spaceID, members, event)
	return nil
}
