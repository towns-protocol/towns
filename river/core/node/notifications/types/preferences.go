package types

import (
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

// UserPreferences are all user cache and web/APN subscriptions a user has configured through the API.
type (
	SpacesMap        map[shared.StreamId]*SpacePreferences
	DMChannelsMap    map[shared.StreamId]DmChannelSettingValue
	GDMChannelsMap   map[shared.StreamId]GdmChannelSettingValue
	SpaceChannelsMap map[shared.StreamId]SpaceChannelSettingValue

	// UserPreferences keep track of notification related preferences.
	// It is meant to be a read only struct that can be copied for updates.
	UserPreferences struct {
		// UserId holds the users derived address
		UserID common.Address
		// DM holds the default notification settings value for all DM streams.
		// This value can be overwritten by DM channel specific configuration.
		DM DmChannelSettingValue
		// GDM holds the default notification settings value for all GDM streams.
		// This value can be overwritten by GDM channel specific configuration.
		GDM GdmChannelSettingValue
		// Spaces is a map from a space id to its settings
		Spaces SpacesMap
		// DMChannels is a map from a DM stream id to its setting
		DMChannels DMChannelsMap
		// GDMChannels is a map from a GDM stream id to its setting
		GDMChannels GDMChannelsMap
		// Subscriptions keeps track of how a user wants to be notified
		Subscriptions Subscriptions
	}

	WebPushSubscription struct {
		Sub      *webpush.Subscription
		LastSeen time.Time
	}

	APNPushSubscription struct {
		DeviceToken []byte
		LastSeen    time.Time
		Environment APNEnvironment
	}

	Subscriptions struct {
		WebPush []*WebPushSubscription
		APNPush []*APNPushSubscription
	}

	SpacePreferences struct {
		// Setting is applied to all channels within the space unless overwritten by a channel specific setting.
		Setting SpaceChannelSettingValue
		// Channels is a list with channel specific settings that overwrite the space wide setting.
		Channels SpaceChannelsMap
	}
)

// Clone creates a deep copy of up
func (up *UserPreferences) Clone() *UserPreferences {
	if up == nil {
		return nil
	}

	cpy := UserPreferences{
		UserID:      up.UserID,
		DM:          up.DM,
		GDM:         up.GDM,
		Spaces:      make(SpacesMap),
		DMChannels:  make(DMChannelsMap),
		GDMChannels: make(GDMChannelsMap),
	}

	for spaceID, space := range up.Spaces {
		pref := &SpacePreferences{
			Setting:  space.Setting,
			Channels: make(map[shared.StreamId]SpaceChannelSettingValue),
		}

		for channelID, channel := range space.Channels {
			pref.Channels[channelID] = channel
		}

		cpy.Spaces[spaceID] = pref
	}

	for channelID, channel := range up.DMChannels {
		cpy.DMChannels[channelID] = channel
	}

	for channelID, channel := range up.GDMChannels {
		cpy.GDMChannels[channelID] = channel
	}

	cpy.Subscriptions.WebPush = append(cpy.Subscriptions.WebPush, up.Subscriptions.WebPush...)
	cpy.Subscriptions.APNPush = append(cpy.Subscriptions.APNPush, up.Subscriptions.APNPush...)

	return &cpy
}

// HasSubscriptions returns an indication if the user has specified to receive notifications on at least 1 type.
func (up *UserPreferences) HasSubscriptions() bool {
	return len(up.Subscriptions.WebPush) > 0 ||
		len(up.Subscriptions.APNPush) > 0
}

// DecodeUserPreferenceFromMsg decodes the given msg into a UserPreference instance.
func DecodeUserPreferenceFromMsg(userID common.Address, msg *SetSettingsRequest) (*UserPreferences, error) {
	preference := UserPreferences{
		UserID:      userID,
		DM:          msg.GetDmGlobal(),
		GDM:         msg.GetGdmGlobal(),
		Spaces:      make(SpacesMap),
		DMChannels:  make(DMChannelsMap),
		GDMChannels: make(GDMChannelsMap),
	}

	// set defaults for DM/GDM streams
	if preference.DM == DmChannelSettingValue_DM_UNSPECIFIED {
		preference.DM = DmChannelSettingValue_DM_MESSAGES_YES
	}
	if preference.GDM == GdmChannelSettingValue_GDM_UNSPECIFIED {
		preference.GDM = GdmChannelSettingValue_GDM_MESSAGES_ALL
	}

	// validate and init DM and GDM channels
	for _, channel := range msg.GetDmChannels() {
		channelID, err := shared.StreamIdFromBytes(channel.GetChannelId())
		if err != nil {
			return nil, err
		}

		if channelID.Type() != shared.STREAM_DM_CHANNEL_BIN {
			return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid DM channel", "channel", channelID)
		}

		if channel.GetValue() == DmChannelSettingValue_DM_UNSPECIFIED {
			return nil, RiverError(Err_INVALID_ARGUMENT, "Missing DM channel setting", "channel", channel)
		}

		preference.DMChannels[channelID] = channel.GetValue()
	}

	for _, channel := range msg.GetGdmChannels() {
		channelID, err := shared.StreamIdFromBytes(channel.GetChannelId())
		if err != nil {
			return nil, err
		}

		if channelID.Type() != shared.STREAM_GDM_CHANNEL_BIN {
			return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid GDM channel", "channel", channelID)
		}

		if channel.GetValue() == GdmChannelSettingValue_GDM_UNSPECIFIED {
			return nil, RiverError(Err_INVALID_ARGUMENT, "Missing GDM channel setting", "channel", channel)
		}

		preference.GDMChannels[channelID] = channel.GetValue()
	}

	// validate and init spaces and channels
	for _, space := range msg.GetSpaces() {
		spaceID, err := shared.StreamIdFromBytes(space.GetSpaceId())
		if err != nil {
			return nil, err
		}

		if spaceID.Type() != shared.STREAM_SPACE_BIN {
			return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid space id", "space", spaceID)
		}

		if space.GetValue() == SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_UNSPECIFIED {
			return nil, RiverError(Err_INVALID_ARGUMENT, "Missing space setting", "space", space)
		}

		spacePreferences := &SpacePreferences{Setting: space.GetValue()}

		preference.Spaces[spaceID] = spacePreferences

		for _, channel := range space.GetChannels() {
			channelID, err := shared.StreamIdFromBytes(channel.GetChannelId())
			if err != nil {
				return nil, err
			}

			if channelID.Type() != shared.STREAM_CHANNEL_BIN {
				return nil, RiverError(Err_INVALID_ARGUMENT,
					"Invalid space channel", "space", spaceID, "channel", channelID)
			}

			if channel.GetValue() == SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_UNSPECIFIED {
				return nil, RiverError(Err_INVALID_ARGUMENT,
					"Missing space channel setting", "space", space, "channel", channel)
			}

			spacePreferences.Channels[channelID] = channel.GetValue()
		}
	}

	return &preference, nil
}

// WantsNotificationForDMMessage returns an indication if the user wants to receive a notification
// for a received DM message.
// Note: channel must be a DM channel.
func (up *UserPreferences) WantsNotificationForDMMessage(channel shared.StreamId) bool {
	// by default use the users global DM setting
	setting := up.DM

	// search for DM channel specific configuration
	if dmChannelSetting, found := up.DMChannels[channel]; found {
		setting = dmChannelSetting
	}

	// determine if for the type of message the user wants to receive a notification
	return setting == DmChannelSettingValue_DM_MESSAGES_YES
}

// WantsNotificationForGDMMessage returns an indication if the user wants to
// receive a notification for a received message in a GDM channel.
// Note: channel must be a GDM channel.
func (up *UserPreferences) WantsNotificationForGDMMessage(
	channel shared.StreamId,
	mentioned bool,
	isParticipating bool,
	msgInteractionType MessageInteractionType,
) bool {
	// by default use the users global GDM setting
	setting := up.GDM

	// overwrite global with GDM channel specific configuration if available
	if gdmChannelSetting, found := up.GDMChannels[channel]; found {
		setting = gdmChannelSetting
	}

	// determine if for the type of message the user wants to receive a notification
	switch setting {
	case GdmChannelSettingValue_GDM_MESSAGES_ALL:
		return true
	case GdmChannelSettingValue_GDM_ONLY_MENTIONS_REPLIES_REACTIONS:
		return mentioned ||
			(isParticipating && msgInteractionType == MessageInteractionType_MESSAGE_INTERACTION_TYPE_REACTION) ||
			(isParticipating && msgInteractionType == MessageInteractionType_MESSAGE_INTERACTION_TYPE_REPLY)
	case GdmChannelSettingValue_GDM_MESSAGES_NO: // disabled notifications for all GDM channels
		return false
	case GdmChannelSettingValue_GDM_MESSAGES_NO_AND_MUTE: // disabled notifications for all GDM channels
		return false
	case GdmChannelSettingValue_GDM_UNSPECIFIED:
		return false
	}

	// by default don't send notifications for GDM messages
	return false
}

// WantNotificationForSpaceChannelMessage returns an indication of the user wants to receive a
// notification for a received space channel message.
// Note: channel must be a space channel.
func (up *UserPreferences) WantNotificationForSpaceChannelMessage(
	space shared.StreamId,
	channel shared.StreamId,
	mentioned bool,
	participating bool,
	msgInteractionType MessageInteractionType,
) bool {
	// by default only send notifications for mentions, replies or reactions for messages in space channels.
	setting := SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS

	if spacePreferences, found := up.Spaces[space]; found {
		// global default is overwritten with space level specific config
		setting = spacePreferences.Setting

		// if there is a channel specific setting use that
		if chanSetting, found := spacePreferences.Channels[channel]; found {
			setting = chanSetting
		}
	}

	// determine if for the type of message the user wants to receive a notification
	switch setting {
	case SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL:
		switch msgInteractionType {
		case MessageInteractionType_MESSAGE_INTERACTION_TYPE_REPLY:
			return participating || mentioned
		case MessageInteractionType_MESSAGE_INTERACTION_TYPE_REACTION:
			return participating
		case MessageInteractionType_MESSAGE_INTERACTION_TYPE_POST,
			MessageInteractionType_MESSAGE_INTERACTION_TYPE_UNSPECIFIED:
			return true
		case MessageInteractionType_MESSAGE_INTERACTION_TYPE_EDIT,
			MessageInteractionType_MESSAGE_INTERACTION_TYPE_REDACTION:
			return false
		}

	case SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS:
		return mentioned ||
			(participating && msgInteractionType == MessageInteractionType_MESSAGE_INTERACTION_TYPE_REACTION) ||
			(participating && msgInteractionType == MessageInteractionType_MESSAGE_INTERACTION_TYPE_REPLY)
	case SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES:
		return false
	case SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE:
		return false
	case SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_UNSPECIFIED:
		return false
	}

	return false // by default spaces and their channels are not muted
}

func (dms DMChannelsMap) Protobuf() []*DmChannelSetting {
	results := make([]*DmChannelSetting, 0, len(dms))
	for streamID, dm := range dms {
		results = append(results, &DmChannelSetting{
			ChannelId: streamID[:],
			Value:     dm,
		})
	}
	return results
}

func (gdms GDMChannelsMap) Protobuf() []*GdmChannelSetting {
	results := make([]*GdmChannelSetting, 0, len(gdms))
	for streamID, gdm := range gdms {
		results = append(results, &GdmChannelSetting{
			ChannelId: streamID[:],
			Value:     gdm,
		})
	}
	return results
}

// Protobuf decodes the SpacesMap into its protobuf representation.
func (spaces SpacesMap) Protobuf() []*SpaceSetting {
	result := make([]*SpaceSetting, 0, len(spaces))
	for spaceID, space := range spaces {
		ss := &SpaceSetting{
			SpaceId:  spaceID[:],
			Value:    space.Setting,
			Channels: make([]*SpaceChannelSetting, 0, len(space.Channels)),
		}

		for channelID, channel := range space.Channels {
			ss.Channels = append(ss.Channels, &SpaceChannelSetting{
				ChannelId: channelID[:],
				Value:     channel,
			})
		}

		result = append(result, ss)
	}

	return result
}
