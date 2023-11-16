import {
    TokenEntitlementDataTypes as TokenEntitlementDataTypesV3,
    TokenEntitlementShim as TokenEntitlementShimV3,
} from './v3/TokenEntitlementShim'
import { UserEntitlementShim as UserEntitlementShimV3 } from './v3/UserEntitlementShim'
import { IMembershipBase as IMembershipBaseV3 } from './v3/ITownArchitectShim'
import { IRolesBase as IRolesBaseV3 } from './v3/IRolesShim'
import { TokenEntitlementShim as TokenEntitlementShimV4 } from './v4/TokenEntitlementShim'
import { UserEntitlementShim as UserEntitlementShimV4 } from './v4/UserEntitlementShim'
import {
    TokenEntitlementDataTypes as TokenEntitlementDataTypesV4,
    ITownArchitectBase as ITownArchitectBaseV4,
    IRolesBase as IRolesBaseV4,
} from './v4/types'

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

type DefaultVersion = 'v3'

export type EntitlementShim<Version = DefaultVersion> = Version extends DefaultVersion
    ? TokenEntitlementShimV3 | UserEntitlementShimV3
    : TokenEntitlementShimV4 | UserEntitlementShimV4

export type ExternalTokenStruct<Version = DefaultVersion> = Version extends DefaultVersion
    ? TokenEntitlementDataTypesV3.ExternalTokenStruct
    : TokenEntitlementDataTypesV4['ExternalTokenStruct']

export type EntitlementStruct<Version = DefaultVersion> = Version extends DefaultVersion
    ? IRolesBaseV3.CreateEntitlementStruct
    : IRolesBaseV4['CreateEntitlementStruct']

type TokenEntitlementShim<Version = DefaultVersion> = Version extends DefaultVersion
    ? TokenEntitlementShimV3
    : TokenEntitlementShimV4

type UserEntitlementShim<Version = DefaultVersion> = Version extends DefaultVersion
    ? UserEntitlementShimV3
    : UserEntitlementShimV4

type MembershipInfoStruct<Version = DefaultVersion> = Version extends DefaultVersion
    ? IMembershipBaseV3.MembershipInfoStruct
    : ITownArchitectBaseV4['MembershipInfoStruct']
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
export interface RoleDetails<Version = DefaultVersion> {
    id: number
    name: string
    permissions: Permission[]
    tokens: ExternalTokenStruct<Version>[]
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
export interface ChannelDetails<Version = DefaultVersion> {
    spaceNetworkId: string
    channelNetworkId: string
    name: string
    disabled: boolean
    roles: RoleEntitlements<Version>[]
    description?: string
}

/**
 * Role details for a channel from multiple contract sources
 */
export interface RoleEntitlements<Version = DefaultVersion> {
    roleId: number
    name: string
    permissions: Permission[]
    tokens: ExternalTokenStruct<Version>[]
    users: string[]
}

/*
    Decoded Token and User entitlenment details
*/
export interface EntitlementDetails<Version = DefaultVersion> {
    tokens: ExternalTokenStruct<Version>[]
    users: string[]
}

export interface BasicRoleInfo {
    roleId: number
    name: string
}

export interface EntitlementModule {
    moduleType: EntitlementModuleType
}

export function isTokenEntitlement<Version = DefaultVersion>(
    entitlement: EntitlementModule,
): entitlement is TokenEntitlementShim<Version> {
    return entitlement.moduleType === EntitlementModuleType.TokenEntitlement
}

export function isUserEntitlement<Version = DefaultVersion>(
    entitlement: EntitlementModule,
): entitlement is UserEntitlementShim<Version> {
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

export function isExternalTokenStructArray<Version = DefaultVersion>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any,
): args is ExternalTokenStruct<Version>[] {
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
    'limit' | 'currency' | 'feeRecipient' | 'price'
>
