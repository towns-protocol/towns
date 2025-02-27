export const PATHS = {
    SPACES: 't',
    EXPLORE: 'explore',
    CHANNELS: 'channels',
    REPLIES: 'replies',
    REGISTER: 'register',
    MENTIONS: 'mentions',
    MEMBERS: 'members',
    THREADS: 'threads',
    // SETTINGS: 'settings',
    LOGIN: 'login',
    VERSIONS: 'versions',
    ROLES: 'roles',
    MESSAGES: 'messages',
    PROFILE: 'profile',
    SEARCH: 'search',
    INVITE: 'invite',
    INVITES: 'invites',
} as const

export const PATHS_REGEX = {
    SPACE_ID: '(0x[0-9a-f]{40}|[0-9a-f]{64})',
    CHANNEL_ID: '([0-9a-f]{64})',
}

export const QUERY_PARAMS = {
    GALLERY_ID: 'galleryId',
    GALLERY_THREAD_ID: 'galleryThreadId',
} as const

export const TOWN_INFO_PARAMS = {
    EDIT_TOWN_NAME: 'edit-town-name',
}

export const CHANNEL_INFO_PARAMS = {
    BROWSE_CHANNELS: 'browse-channels',
    BANNED: 'banned',
    BUG_REPORT: 'bug-report',
    CHANNEL_INFO: 'channel',
    CREATE_CHANNEL: 'create-channel',
    DIRECTORY: 'directory',
    DM_CHANNEL_INFO: 'dm',
    EDIT_CHANNEL_PERMISSIONS: 'edit-channel-permissions',
    EDIT_CHANNEL_PERMISSION_OVERRIDES: 'channel-permission-overrides',
    EDIT_CHANNEL_RIVER_METADATA: 'edit-channel-river-metadata',
    GDM_CHANNEL_INFO: 'gdm',
    INVITE: 'invite',
    PERMISSIONS: 'permissions',
    PREFERENCES: 'preferences',
    PROFILE: 'profile',
    REVIEWS: 'reviews',
    ROLES: 'roles',
    THREAD: 'thread',
    TOWN_INFO: 'town-info',
    WALLETS: 'wallets',
    EDIT_MEMBERSHIP: 'edit-membership',
    SPACE_SETTINGS_NAVIGATION: 'space-settings',
    PREPAID_MEMBERSHIPS: 'prepaid-memberships',
    NODE_STATUS: 'node-status',
    MINT_BOT: 'mint-bot',
    ROLE_RESTRICTED_CHANNEL_JOIN: 'role-restricted-channel-join',
    MUTUAL_TOWNS: 'mutual-towns',
    PINS: 'pins',
    BEARER_TOKEN: 'bearer-token',
    TOWN_MEMBERS: 'town-members',
    SINGLE_WALLET: 'wallet',
    TRADE_PANEL: 'trade',
    TRANSFER_ASSETS: 'transfer-assets',
    VERIFY_EVENT_SIGNATURE: 'verify-event-signature',
    IDENTITY: 'identity',
    FUND_WALLET: 'fund-wallet',
    RIVER_POINTS: 'river-points',
    TRADING_WALLET: 'trading-wallet',
    TRADING_DEPOSIT: 'trading-deposit',
} as const

export type CHANNEL_INFO_PARAMS_VALUES =
    (typeof CHANNEL_INFO_PARAMS)[keyof typeof CHANNEL_INFO_PARAMS]
