import { TokenDataTypes } from './shims/TokenEntitlementShim'

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
    Owner = 'Owner',
}

export enum EntitlementModuleType {
    TokenEntitlement = 'TokenEntitlement',
    UserEntitlement = 'UserEntitlement',
}

export interface EntitlementModule {
    address: string
    moduleType: EntitlementModuleType
    name: string
}

export interface RoleDetails {
    id: number
    name: string
    permissions: Permission[]
    tokens: TokenDataTypes.ExternalTokenStruct[]
    users: string[]
}
