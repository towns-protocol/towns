export const PATHS = {
    SPACES: 't',
    CHANNELS: 'channels',
    REPLIES: 'replies',
    REGISTER: 'register',
    GETTING_STARTED: 'getting-started',
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
} as const

export const QUERY_PARAMS = {
    GALLERY_ID: 'galleryId',
    GALLERY_THREAD_ID: 'galleryThreadId',
} as const

export const CHANNEL_INFO_PARAMS = {
    INFO: 'info',
    CHANNEL: 'channel',
    DM_CHANNEL: 'dm',
    GDM_CHANNEL: 'gdm',
    PERMISSIONS: 'permissions',
    DIRECTORY: 'directory',
    INVITE: 'invite',
    BROWSE_CHANNELS: 'browse-channels',
} as const

export type CHANNEL_INFO_PARAMS_VALUES =
    (typeof CHANNEL_INFO_PARAMS)[keyof typeof CHANNEL_INFO_PARAMS]

export const NESTED_PROFILE_PANEL_PATHS = {
    WALLETS: 'wallets',
    ROLES: 'roles',
} as const
