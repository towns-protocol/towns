// SpaceSettingValue is a user specified setting that is applied to all channels in a space by default and can be

import {
    DmChannelSettingValue,
    GdmChannelSettingValue,
    SpaceChannelSettingValue,
} from '@towns-protocol/proto'
import { staticAssertNever } from 'use-towns-client'
import { IconName } from '@ui'

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

export interface ChannelNotificationSetting {
    value: SpaceChannelSettingValue
    title: string
    description: string
    icon: IconName
}

export const channelNotificationSettings: ChannelNotificationSetting[] = [
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

export function resetToSpaceDefault(spaceDefault: SpaceChannelSettingValue) {
    const menuConfig = () => {
        switch (spaceDefault) {
            case SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_MESSAGES_ALL:
                return {
                    ...MenuConfig.all,
                    title: `Reset to Space Default (${MenuConfig.all.title})`,
                }
            case SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS:
                return {
                    ...MenuConfig.mentionsRepliesReactions,
                    title: `Reset to Space Default (${MenuConfig.mentionsRepliesReactions.title})`,
                }
            case SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES:
                return {
                    ...MenuConfig.notificationsOff,
                    title: `Reset to Space Default (${MenuConfig.notificationsOff.title})`,
                }
            case SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE:
                return {
                    ...MenuConfig.muted,
                    title: `Reset to Space Default (${MenuConfig.muted.title})`,
                }
            case SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_UNSPECIFIED:
                return {
                    ...MenuConfig.mentionsRepliesReactions,
                    title: `Reset to Space Default (${MenuConfig.mentionsRepliesReactions.title})`,
                }
            default:
                staticAssertNever(spaceDefault)
        }
    }
    return {
        value: SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_UNSPECIFIED, // reset channel to unspecified so that it picks up the space default
        ...menuConfig(),
    }
}

export function resetToGdmDefault(gdmGlobalDefault: GdmChannelSettingValue) {
    const menuConfig = () => {
        switch (gdmGlobalDefault) {
            case GdmChannelSettingValue.GDM_MESSAGES_ALL:
                return {
                    ...MenuConfig.all,
                    title: `Reset to GDM Default (${MenuConfig.all.title})`,
                }
            case GdmChannelSettingValue.GDM_ONLY_MENTIONS_REPLIES_REACTIONS:
                return {
                    ...MenuConfig.mentionsRepliesReactions,
                    title: `Reset to GDM Default (${MenuConfig.mentionsRepliesReactions.title})`,
                }
            case GdmChannelSettingValue.GDM_MESSAGES_NO:
                return {
                    ...MenuConfig.notificationsOff,
                    title: `Reset to GDM Default (${MenuConfig.notificationsOff.title})`,
                }
            case GdmChannelSettingValue.GDM_MESSAGES_NO_AND_MUTE:
                return {
                    ...MenuConfig.muted,
                    title: `Reset to GDM Default (${MenuConfig.muted.title})`,
                }
            case GdmChannelSettingValue.GDM_UNSPECIFIED:
                return {
                    ...MenuConfig.all,
                    title: `Reset to GDM Default (${MenuConfig.all.title})`,
                }
            default:
                staticAssertNever(gdmGlobalDefault)
        }
    }
    return {
        value: GdmChannelSettingValue.GDM_UNSPECIFIED, // reset channel to unspecified so that it picks up the gdm default
        ...menuConfig(),
    }
}

export function resetToDmDefault(dmGlobalDefault: DmChannelSettingValue) {
    const menuConfig = () => {
        switch (dmGlobalDefault) {
            case DmChannelSettingValue.DM_MESSAGES_YES:
                return {
                    ...MenuConfig.all,
                    title: `Reset to DM Default (${MenuConfig.all.title})`,
                }
            case DmChannelSettingValue.DM_MESSAGES_NO:
                return {
                    ...MenuConfig.notificationsOff,
                    title: `Reset to DM Default (${MenuConfig.notificationsOff.title})`,
                }
            case DmChannelSettingValue.DM_MESSAGES_NO_AND_MUTE:
                return {
                    ...MenuConfig.muted,
                    title: `Reset to DM Default (${MenuConfig.muted.title})`,
                }
            case DmChannelSettingValue.DM_UNSPECIFIED:
                return {
                    ...MenuConfig.all,
                    title: `Reset to DM Default (${MenuConfig.all.title})`,
                }
            default:
                staticAssertNever(dmGlobalDefault)
        }
    }
    return {
        value: DmChannelSettingValue.DM_UNSPECIFIED, // reset channel to unspecified so that it picks up the dm default
        ...menuConfig(),
    }
}

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
        value: GdmChannelSettingValue.GDM_MESSAGES_NO,
        ...MenuConfig.notificationsOff,
    },
    {
        value: GdmChannelSettingValue.GDM_MESSAGES_NO_AND_MUTE,
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
