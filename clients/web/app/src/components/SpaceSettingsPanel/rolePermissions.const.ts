import { Permission } from '@river-build/web3'

export const rolePermissionDescriptions: {
    [key in Permission]?: {
        name: string
        description: string
        disabled?: boolean
    }
} = {
    [Permission.Read]: {
        name: 'Read messages',
        description: 'Allow members to read messages.',
        disabled: true,
    },
    [Permission.Write]: {
        name: 'Send messages',
        description: 'Allow members to send messages.',
    },
    [Permission.AddRemoveChannels]: {
        name: 'Manage channels',
        description: 'Allow members to create, edit or delete channels.',
    },
    [Permission.Redact]: {
        name: 'Remove messages',
        description: 'Allow members to remove messages.',
    },
    [Permission.Ban]: {
        name: 'Ban members',
        description: 'Allow members to ban other members.',
    },
    [Permission.ModifySpaceSettings]: {
        name: 'Manage town settings',
        description:
            'Allow members to create, edit and delete roles and their corresponding permissions. Additionally, members can change the town image, description, and motto.',
    },
} as const

export const enabledRolePermissions = Object.keys(rolePermissionDescriptions).map(
    (key) => Permission[key as keyof typeof Permission],
)

// the minter and member roles created in town creation
export const minterRoleId = 1
export const memberRoleId = 2
export const nonRemovableRoleIds = [minterRoleId, memberRoleId]
