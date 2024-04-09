export const PATHS = {
    SPACES: 't',
    CHANNELS: 'channels',
    REPLIES: 'replies',
    REGISTER: 'register',
    MENTIONS: 'mentions',
    MEMBERS: 'members',
    THREADS: 'threads',
    SETTINGS: 'settings',
    LOGIN: 'login',
    VERSIONS: 'versions',
    ROLES: 'roles',
    MESSAGES: 'messages',
    PROFILE: 'profile',
    SEARCH: 'search',
    INVITE: 'invite',
    INVITES: 'invites',
} as const

export const QUERY_PARAMS = {
    GALLERY_ID: 'galleryId',
    GALLERY_THREAD_ID: 'galleryThreadId',
} as const

export const CHANNEL_INFO_PARAMS = {
    BROWSE_CHANNELS: 'browse-channels',
    BANNED: 'banned',
    BUG_REPORT: 'bug-report',
    CHANNEL_INFO: 'channel',
    CREATE_CHANNEL: 'create-channel',
    DIRECTORY: 'directory',
    DM_CHANNEL_INFO: 'dm',
    EDIT_CHANNEL: 'edit-channel',
    GDM_CHANNEL_INFO: 'gdm',
    INVITE: 'invite',
    PERMISSIONS: 'permissions',
    PROFILE: 'profile',
    ROLES: 'roles',
    THREAD: 'thread',
    TOWN_INFO: 'town-info',
    WALLETS: 'wallets',
} as const

export type CHANNEL_INFO_PARAMS_VALUES =
    (typeof CHANNEL_INFO_PARAMS)[keyof typeof CHANNEL_INFO_PARAMS]
