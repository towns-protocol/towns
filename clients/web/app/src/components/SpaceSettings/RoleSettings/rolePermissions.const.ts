import { Permission } from '@river/web3'

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
    [Permission.AddRemoveChannels]: {
        name: 'Add / Remove Channels',
        description: 'Allows members to add and remove channels.',
    },
    [Permission.ModifySpaceSettings]: {
        name: 'Modify Space Settings',
        description:
            'Allows members to modify the space settings. Change space image, name, topic, and other settings such as permissions.',
    },
} as const

export const enabledRolePermissions = Object.keys(rolePermissionDescriptions)
    .filter((k) => k !== Permission.Owner)
    .map((key) => Permission[key as keyof typeof Permission])
