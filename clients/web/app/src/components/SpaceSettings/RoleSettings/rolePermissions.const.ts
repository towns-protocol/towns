export const rolePermissionDescriptions = {
    read_messages: {
        name: 'Read Messages',
        description: 'Allows members to read messages in public channels.',
    },
    send_messages: {
        name: 'Send Messages',
        description: 'Allows members to send messages in public channels.',
    },
    manage_roles: {
        name: 'Manage Roles',
        description: 'Allows members to manage roles and permissions',
    },
    manage_channels: {
        name: 'Manage Channels',
        description: 'Allows members to manage channels',
    },
    remove_messages: {
        name: 'Remove Messages',
        description: 'Allows members to remove messages',
    },
    ban_members: {
        name: 'Ban Members',
        description: 'Allows members to ban other members',
    },
} as const

export const enabledRolePermissions = [
    'read_messages',
    'send_messages',
    'manage_roles',
    'manage_channels',
    'remove_messages',
    'ban_members',
] as const
