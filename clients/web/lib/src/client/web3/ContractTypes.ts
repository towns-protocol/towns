import { TokenDataTypes } from './shims/TokenEntitlementShim'
import { TokenEntitlementDataTypes, TokenEntitlementShim } from './v3/TokenEntitlementShim'
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
export type EntitlementShim = TokenEntitlementShim | UserEntitlementShim

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

export function isExternalTokenStruct(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any,
): args is TokenEntitlementDataTypes.ExternalTokenStruct {
    return (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        typeof args.contractAddress === 'string' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        typeof args.isSingleToken === 'boolean' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        args.quantity !== undefined &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        args.tokenIds !== undefined
    )
}

export function isExternalTokenStructArray(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any,
): args is TokenEntitlementDataTypes.ExternalTokenStruct[] {
    return Array.isArray(args) && args.length > 0 && args.every(isExternalTokenStruct)
}

export function isStringArray(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any,
): args is string[] {
    return Array.isArray(args) && args.length > 0 && args.every((arg) => typeof arg === 'string')
}
