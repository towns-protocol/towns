package sync

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/track_streams"
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
)

type notificationsTrackedStreamView struct {
	TrackedStreamViewImpl
	listener        track_streams.StreamEventListener
	userPreferences UserPreferencesStore
}

func (n *notificationsTrackedStreamView) onNewEvent(ctx context.Context, view *StreamView, event *ParsedEvent) error {
	// in case the event was a block/unblock event update the users blocked list.
	streamID := view.StreamId()
	if streamID.Type() == shared.STREAM_USER_SETTINGS_BIN {
		if settings := event.Event.GetUserSettingsPayload(); settings != nil {
			if userBlock := settings.GetUserBlock(); userBlock != nil {
				userID := common.BytesToAddress(event.Event.CreatorAddress)
				blockedUser := common.BytesToAddress(userBlock.GetUserId())

				if userBlock.GetIsBlocked() {
					n.userPreferences.BlockUser(userID, blockedUser)
				} else {
					n.userPreferences.UnblockUser(userID, blockedUser)
				}
			}
		}

		return nil
	}

	if view == nil {
		return nil
	}

	// otherwise for each member that is a member of the stream, or for anyone that is mentioned
	members, err := view.GetChannelMembers()
	if err != nil {
		return err
	}

	n.listener.OnMessageEvent(ctx, *streamID, view.StreamParentId(), members, event)
	return nil
}

// NewTrackedStreamForNotifications constructs a TrackedStreamView instance from the given
// stream, and executes callbacks to ensure that the user's blocked list is up to date and that message events
// are sent to the supplied listener. It's expected that the stream cookie starts with a miniblock that
// contains a snapshot with stream members.
func NewTrackedStreamForNotifications(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	listener track_streams.StreamEventListener,
	userPreferences UserPreferencesStore,
) (TrackedStreamView, error) {
	trackedView := &notificationsTrackedStreamView{
		listener:        listener,
		userPreferences: userPreferences,
	}

	internalView, err := trackedView.TrackedStreamViewImpl.Init(
		ctx,
		streamID,
		cfg,
		stream,
		trackedView.onNewEvent,
	)
	if err != nil {
		return nil, err
	}

	// Load the list of users that someone has blocked from their personal user settings stream into the user
	// preference cache which is queried when determining if a notification must be sent.
	streamId := internalView.StreamId()
	if streamId.Type() == shared.STREAM_USER_SETTINGS_BIN {
		user := common.BytesToAddress(streamId[1:21])
		if blockedUsers, err := internalView.BlockedUsers(); err == nil {
			blockedUsers.Each(func(address common.Address) bool {
				trackedView.userPreferences.BlockUser(user, address)
				return false
			})
		}
	}

	return trackedView, nil
}
