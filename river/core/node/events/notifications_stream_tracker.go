package events

import (
	"context"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

type (
	UserPreferencesStore interface {
		// BlockUser blocks the given blockedUser for the given user
		BlockUser(
			user common.Address,
			blockedUser common.Address,
		)

		// UnblockUser unblocks the given blockedUser for the given user
		UnblockUser(
			user common.Address,
			blockedUser common.Address,
		)
	}

	// TrackedNotificationStreamView is part the notification service and put in the events package to provide access to
	// some of the private types/methods of this package. It is a wrapper around StreamView to apply events.
	// In addition, it keeps track of which notifications are processed to prevent double event processing.
	TrackedNotificationStreamView struct {
		streamID        shared.StreamId
		view            *StreamView
		cfg             crypto.OnChainConfiguration
		listener        StreamEventListener
		userPreferences UserPreferencesStore
	}

	StreamEventListener interface {
		OnMessageEvent(
			ctx context.Context,
			streamID shared.StreamId,
			parentStreamID *shared.StreamId, // only
			members mapset.Set[string],
			event *ParsedEvent,
		)
	}
)

// NewNotificationsStreamTrackerFromStreamAndCookie constructs a TrackedNotificationStreamView instance from the given
// stream. It's expected that the stream cookie starts with a miniblock that contains a snapshot with stream members.
func NewNotificationsStreamTrackerFromStreamAndCookie(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	listener StreamEventListener,
	userPreferences UserPreferencesStore,
) (*TrackedNotificationStreamView, error) {
	view, err := MakeRemoteStreamView(ctx, stream)
	if err != nil {
		return nil, err
	}

	// Load the list of users that someone has blocked from their personal user settings stream into the user
	// preference cache which is queried when determining if a notification must be sent.
	if view.streamId.Type() == shared.STREAM_USER_SETTINGS_BIN {
		user := common.BytesToAddress(view.streamId[1:21])
		if blockedUsers, err := view.BlockedUsers(); err == nil {
			blockedUsers.Each(func(address common.Address) bool {
				userPreferences.BlockUser(user, address)
				return false
			})
		}
	}

	ts := &TrackedNotificationStreamView{
		streamID:        streamID,
		cfg:             cfg,
		view:            view,
		listener:        listener,
		userPreferences: userPreferences,
	}

	return ts, nil
}

func (ts *TrackedNotificationStreamView) ApplyBlock(
	miniblock *Miniblock,
	cfg *crypto.OnChainSettings,
) error {
	mb, err := NewMiniblockInfoFromProto(miniblock, NewParsedMiniblockInfoOpts())
	if err != nil {
		return err
	}

	return ts.applyBlock(mb, cfg)
}

func (ts *TrackedNotificationStreamView) ApplyEvent(
	ctx context.Context,
	event *Envelope,
) error {
	parsedEvent, err := ParseEvent(event)
	if err != nil {
		return err
	}

	// add event calls the message listener that send notifications when needed
	return ts.addEvent(ctx, parsedEvent)
}

func (ts *TrackedNotificationStreamView) LatestSyncCookie() *SyncCookie {
	return ts.view.SyncCookie(common.Address{})
}

func (ts *TrackedNotificationStreamView) applyBlock(
	miniblock *MiniblockInfo,
	cfg *crypto.OnChainSettings,
) error {
	view, _, err := ts.view.copyAndApplyBlock(miniblock, cfg)
	if err != nil {
		return err
	}

	ts.view = view
	return nil
}

func (ts *TrackedNotificationStreamView) addEvent(
	ctx context.Context,
	event *ParsedEvent,
) error {
	if ts.view.minipool.events.Has(event.Hash) || event.Event.GetMiniblockHeader() != nil {
		return nil
	}

	view, err := ts.view.copyAndAddEvent(event)
	if err != nil {
		return err
	}
	ts.view = view

	// in case the event was a block/unblock event update the users blocked list.
	if ts.streamID.Type() == shared.STREAM_USER_SETTINGS_BIN {
		if settings := event.Event.GetUserSettingsPayload(); settings != nil {
			if userBlock := settings.GetUserBlock(); userBlock != nil {
				userID := common.BytesToAddress(event.Event.CreatorAddress)
				blockedUser := common.BytesToAddress(userBlock.GetUserId())

				if userBlock.GetIsBlocked() {
					ts.userPreferences.BlockUser(userID, blockedUser)
				} else {
					ts.userPreferences.UnblockUser(userID, blockedUser)
				}
			}
		}

		return nil
	}

	return ts.SendEventNotification(ctx, event)
}

func (ts *TrackedNotificationStreamView) SendEventNotification(
	ctx context.Context,
	event *ParsedEvent,
) error {
	view := ts.view
	if view == nil {
		return nil
	}

	// otherwise for each member that is a member of the stream, or for anyone that is mentioned
	members, err := ts.view.GetChannelMembers()
	if err != nil {
		return err
	}

	ts.listener.OnMessageEvent(ctx, ts.streamID, view.StreamParentId(), members, event)

	return nil
}
