import { Permission } from '@river-build/web3'

export const channelPermissionDescriptions: {
    [key in Permission]?: {
        name: string
        description: string
    }
} = {
    [Permission.Read]: {
        name: 'Read messages',
        description: 'Allow members to read messages.',
    },
    [Permission.Write]: {
        name: 'Send messages',
        description: 'Allow members to send messages.',
    },
    [Permission.React]: {
        name: 'React',
        description: 'Allow members to emoji react to messages.',
    },
    [Permission.AddRemoveChannels]: {
        name: 'Manage channels',
        description: 'Allow members to create, edit or delete channels.',
    },
    [Permission.Redact]: {
        name: 'Remove messages',
        description: 'Allow members to remove messages.',
    },
    [Permission.PinMessage]: {
        name: 'Pin messages',
        description: 'Allow members to pin messages to the channel.',
    },
} as const

export const townPermissionDescriptions: {
    [key in Permission]?: {
        name: string
        description: string
        disabled?: boolean
    }
} = {
    [Permission.Ban]: {
        name: 'Ban members',
        description: 'Allow members to ban other members.',
    },
    [Permission.ModifySpaceSettings]: {
        name: 'Manage roles',
        description:
            'Allow members to create, edit and delete roles and their corresponding permissions.',
    },
} as const

export const enabledChannelPermissions = Object.keys(channelPermissionDescriptions).map(
    (key) => Permission[key as keyof typeof Permission],
)

export const enabledTownPermissions = Object.keys(townPermissionDescriptions).map(
    (key) => Permission[key as keyof typeof Permission],
)

// the minter and member roles created in town creation
export const minterRoleId = 1
export const memberRoleId = 2
export const nonRemovableRoleIds = [minterRoleId, memberRoleId]
