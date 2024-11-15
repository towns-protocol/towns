// SpaceSettingValue is a user specified setting that is applied to all channels in a space by default and can be

import { IconName } from '@ui'

// overwritten with channel specific settings.
enum SpaceChannelSettingValue {
    // SPACE_CHANNEL_SETTING_UNSPECIFIED not set, assumes SPACE_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS as default.
    SPACE_CHANNEL_SETTING_UNSPECIFIED = 0,
    // SPACE_CHANNEL_SETTING_NO_MESSAGES indicates that the user won't receive notifications of any channel in the space.
    SPACE_CHANNEL_SETTING_NO_MESSAGES = 1,
    // SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE indicates that the user won't receive notifications of any channel in
    // the space and the UI must not render any feedback that a message was received.
    SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE = 2,
    // SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS indicates that the user will receive notifications for
    // messages that either the user is mentioned in or are a direct reply/reaction to his own message. This is the
    // default.
    SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS = 3,
    // SPACE_CHANNEL_SETTING_MESSAGES_ALL indicates that the user will receive notifications for all types of
    // messages/reactions for all channels in the space.
    SPACE_CHANNEL_SETTING_MESSAGES_ALL = 4,
}

// DmChannelSettingValue specifies if the user wants to receive notifications for DM streams.
// This can be overwritten with DM channel specific configuration.
enum DmChannelSettingValue {
    // DM_UNSPECIFIED not set, assumes DM_MESSAGES_YES as a default.
    DM_UNSPECIFIED = 0,
    // DM_MESSAGES_YES indicates that the user wants to receive notifications for DM channels.
    DM_MESSAGES_YES = 1,
    // DM_MESSAGES_NO indicates that the user doesn't want to receive notifications for DM channels.
    DM_MESSAGES_NO = 2,
    // DM_MESSAGES_NO_AND_MUTE indicates that the user doesn't want to receive notifications for DM channels
    // and the UI should not render any feedback that a message was received.
    DM_MESSAGES_NO_AND_MUTE = 3,
}

// GdmChannelSettingValue is a default setting that is applied to all GDM streams a user is in and can be
// overwritten by GDM channel specific settings.
enum GdmChannelSettingValue {
    // GDM_UNSPECIFIED not set, assumes GDM_MESSAGES_ALL as a default.
    GDM_UNSPECIFIED = 0,
    // GDM_NO_MESSAGES indicates that the user will not receive notifications for GDM channels.
    GDM_NO_MESSAGES = 1,
    // GDM_NO_MESSAGES_AND_MUTE indicates that the user doesn't want to receive notifications for GDM channels
    // and the UI should not render any feedback that a message was received.
    GDM_NO_MESSAGES_AND_MUTE = 2,
    // GDM_ONLY_MENTIONS_REPLIES_REACTIONS indicates that the user receives notifications for messages added to
    // GDM channels that are either a direct reply or a reaction to his own messages.
    GDM_ONLY_MENTIONS_REPLIES_REACTIONS = 3,
    // GDM_MESSAGES_ALL indicates that the user receives notifications for all messages in GDM channels.
    // This is the default.
    GDM_MESSAGES_ALL = 4,
}

const MenuConfig = {
    all: {
        title: 'All messages',
        description: 'Get notifications for all messages.',
        icon: 'notificationsOn',
    },
    mentionsRepliesReactions: {
        title: 'Mentions, replies, and reactions',
        description: 'Get notifications for mentions, replies, and reactions.',
        icon: 'notificationsOn',
    },
    notificationsOff: {
        title: 'Notifications off',
        description: 'No notifications, but you will still see unread indicators.',
        icon: 'notificationsOff',
    },
    muted: {
        title: 'Muted',
        description: 'No unread indicators and notifications off.',
        icon: 'notificationsOff',
    },
} as const

export const channelNotificationSettings: {
    value: SpaceChannelSettingValue
    title: string
    description: string
    icon: IconName
}[] = [
    {
        value: SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_MESSAGES_ALL,
        ...MenuConfig.all,
    },
    {
        value: SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS,
        ...MenuConfig.mentionsRepliesReactions,
    },
    {
        value: SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES,
        ...MenuConfig.notificationsOff,
    },
    {
        value: SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE,
        ...MenuConfig.muted,
    },
]

export const gdmNotificationSettings: {
    value: GdmChannelSettingValue
    title: string
    description: string
    icon: IconName
}[] = [
    {
        value: GdmChannelSettingValue.GDM_MESSAGES_ALL,
        ...MenuConfig.all,
    },
    {
        value: GdmChannelSettingValue.GDM_ONLY_MENTIONS_REPLIES_REACTIONS,
        ...MenuConfig.mentionsRepliesReactions,
    },
    {
        value: GdmChannelSettingValue.GDM_NO_MESSAGES,
        ...MenuConfig.notificationsOff,
    },
    {
        value: GdmChannelSettingValue.GDM_NO_MESSAGES_AND_MUTE,
        ...MenuConfig.muted,
    },
]

export const dmNotificationSettings: {
    value: DmChannelSettingValue
    title: string
    description: string
    icon: IconName
}[] = [
    {
        value: DmChannelSettingValue.DM_MESSAGES_YES,
        ...MenuConfig.all,
    },
    {
        value: DmChannelSettingValue.DM_MESSAGES_NO,
        ...MenuConfig.notificationsOff,
    },
    {
        value: DmChannelSettingValue.DM_MESSAGES_NO_AND_MUTE,
        ...MenuConfig.muted,
    },
]
