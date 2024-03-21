import { Permission } from '@river/web3'

export const rolePermissionDescriptions: {
    [key in Permission]?: {
        name: string
        description: string
    }
} = {
    [Permission.Read]: {
        name: 'Read messages',
        description: 'Allows members to read messages.',
    },
    [Permission.Write]: {
        name: 'Send messages',
        description: 'Allows members to send messages.',
    },
    [Permission.AddRemoveChannels]: {
        name: 'Manage channels',
        description: 'Allows members to create, edit or delete channels.',
    },
    [Permission.Ban]: {
        name: 'Ban members',
        description: 'Allows members to ban other members.',
    },
    [Permission.ModifySpaceSettings]: {
        name: 'Modify town settings',
        description:
            'Allows members to modify the town settings. Change town image, name, topic, and other settings such as permissions and roles.',
    },
} as const

export const enabledRolePermissions = Object.keys(rolePermissionDescriptions).map(
    (key) => Permission[key as keyof typeof Permission],
)

// the minter and member roles created in town creation
export const minterRoleId = 1
export const memberRoleId = 2
export const nonRemovableRoleIds = [minterRoleId, memberRoleId]
