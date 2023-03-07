import { Permission } from 'use-zion-client'

export const rolePermissionDescriptions: {
    [key in Permission]?: {
        name: string
        description: string
    }
} = {
    [Permission.Read]: {
        name: 'Read Messages',
        description: 'Allows members to read messages.',
    },
    [Permission.Write]: {
        name: 'Send Messages',
        description: 'Allows members to send messages.',
    },
    [Permission.Invite]: {
        name: 'Invite Users',
        description: 'Allows members to invite other users.',
    },
    [Permission.Redact]: {
        name: 'Remove Messages',
        description: 'Allows members to remove messages.',
    },
    [Permission.Ban]: {
        name: 'Ban',
        description: 'Allows members to ban other members.',
    },
    [Permission.Ping]: {
        name: 'Ping Members',
        description: 'Allows members to ping other members.',
    },
    [Permission.PinMessage]: {
        name: 'Pin Message',
        description: 'Allows members to pin messages.',
    },
    [Permission.AddRemoveChannels]: {
        name: 'Add / Remove Channels',
        description: 'Allows members to add and remove channels.',
    },
    [Permission.ModifySpaceSettings]: {
        name: 'Moderate Space',
        description:
            'Allows members to moderate space. Change space image, name, topic, modify settings such as permissions.',
    },
    [Permission.ModifySpaceSettings]: {
        name: 'Moderate Space',
        description:
            'Allows members to moderate space. Change space image, name, topic, modify settings such as permissions.',
    },
    [Permission.Upgrade]: {
        name: 'Upgrade Space',
        description: 'Allows members to upgrade the space.',
    },
} as const

export const enabledRolePermissions = Object.keys(Permission)
    .filter((k) => k !== Permission.Owner)
    .map((key) => Permission[key as keyof typeof Permission])
