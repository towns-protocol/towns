import { TokenDataTypes } from './shims/TokenEntitlementShim'
import { TokenEntitlementShim } from './v3/TokenEntitlementShim'
import { UserEntitlementShim } from './v3/UserEntitlementShim'

export enum Permission {
    Read = 'Read',
    Write = 'Write',
    Invite = 'Invite',
    Redact = 'Redact',
    Ban = 'Ban',
    Ping = 'Ping',
    PinMessage = 'PinMessage',
    AddRemoveChannels = 'AddRemoveChannels',
    ModifySpaceSettings = 'ModifySpaceSettings',
    Owner = 'Owner',
    Upgrade = 'Upgrade',
}

/**
 * Supported entitlement modules
 */
export type SupportedEntitlement = TokenEntitlementShim | UserEntitlementShim

export enum EntitlementModuleType {
    TokenEntitlement = 'TokenEntitlement',
    UserEntitlement = 'UserEntitlement',
}

/**
 * Role details from multiple contract sources
 */
export interface RoleDetails {
    id: number
    name: string
    permissions: Permission[]
    tokens: TokenDataTypes.ExternalTokenStruct[]
    users: string[]
    channels: ChannelMetadata[]
}

/**
 * Basic channel metadata from the space contract.
 */
export interface ChannelMetadata {
    name: string
    channelNetworkId: string
    disabled: boolean
}

/**
 * Channel details from multiple contract sources
 */
export interface ChannelDetails {
    spaceNetworkId: string
    channelNetworkId: string
    name: string
    disabled: boolean
    roles: RoleEntitlements[]
    description?: string
}

/**
 * Role details for a channel from multiple contract sources
 */
export interface RoleEntitlements {
    roleId: number
    name: string
    permissions: Permission[]
    tokens: TokenDataTypes.ExternalTokenStruct[]
    users: string[]
}

export interface BasicRoleInfo {
    roleId: number
    name: string
}

export interface EntitlementModule {
    moduleType: EntitlementModuleType
}

export function isTokenEntitlement(
    entitlement: EntitlementModule,
): entitlement is TokenEntitlementShim {
    return entitlement.moduleType === EntitlementModuleType.TokenEntitlement
}

export function isUserEntitlement(
    entitlement: EntitlementModule,
): entitlement is UserEntitlementShim {
    return entitlement.moduleType === EntitlementModuleType.UserEntitlement
}
