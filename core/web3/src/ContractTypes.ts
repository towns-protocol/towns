import {
    TokenEntitlementDataTypes as TokenEntitlementDataTypesV3,
    TokenEntitlementShim as TokenEntitlementShimV3,
} from './v3/TokenEntitlementShim'
import { UserEntitlementShim as UserEntitlementShimV3 } from './v3/UserEntitlementShim'
import {
    IMembershipBase as IMembershipBaseV3,
    IArchitectBase as ITownArchitectBaseV3,
} from './v3/ITownArchitectShim'
import { IRolesBase as IRolesBaseV3 } from './v3/IRolesShim'

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
    JoinTown = 'JoinTown',
}

export type Versions = 'v3'
export const defaultVersion: Versions = 'v3'
export type TDefaultVersion = typeof defaultVersion

export type EntitlementShim = TokenEntitlementShimV3 | UserEntitlementShimV3

export type ExternalTokenStruct = TokenEntitlementDataTypesV3.ExternalTokenStruct

export type EntitlementStruct = IRolesBaseV3.CreateEntitlementStruct

type TokenEntitlementShim = TokenEntitlementShimV3

type UserEntitlementShim = UserEntitlementShimV3

type MembershipInfoStruct = IMembershipBaseV3.MembershipStruct

type TotalSupplyOutputStruct = { totalSupply: number }

export type MembershipStruct = ITownArchitectBaseV3.MembershipStruct

export type TownInfoStruct = ITownArchitectBaseV3.SpaceInfoStruct

/**
 * Supported entitlement modules
 */
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
    tokens: ExternalTokenStruct[]
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
    tokens: ExternalTokenStruct[]
    users: string[]
}

/*
    Decoded Token and User entitlenment details
*/
export interface EntitlementDetails {
    tokens: ExternalTokenStruct[]
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
): args is ExternalTokenStruct {
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
): args is ExternalTokenStruct[] {
    return Array.isArray(args) && args.length > 0 && args.every(isExternalTokenStruct)
}

export function isStringArray(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any,
): args is string[] {
    return Array.isArray(args) && args.length > 0 && args.every((arg) => typeof arg === 'string')
}

export type MembershipInfo = Pick<
    MembershipInfoStruct,
    'maxSupply' | 'currency' | 'feeRecipient' | 'price'
>

export type TotalSupplyInfo = Pick<TotalSupplyOutputStruct, 'totalSupply'>

export type Address = `0x${string}`
