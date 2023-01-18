/**
 * Todo: Should generate and publish from our solidity contract definition.
 */
export enum Permission {
    Read = 'Read',
    Write = 'Write',
    Invite = 'Invite',
    Everyone = 'Everyone',
    Redact = 'Redact',
    Ban = 'Ban',
    Ping = 'Ping',
    PinMessage = 'PinMessage',
    ModifyChannelPermissions = 'ModifyChannelPermissions',
    ModifyProfile = 'ModifyProfile',
    AddRemoveChannels = 'AddRemoveChannels',
    ModifySpacePermissions = 'ModifySpacePermissions',
    ModifyChannelDefaults = 'ModifyChannelDefaults',
}

export enum EntitlementModuleType {
    TokenEntitlement = 'TokenEntitlement',
    UserEntitlement = 'UserEntitlement',
}
