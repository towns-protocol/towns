import { UserEntitlementShim as UserEntitlementShimV3 } from './v3/UserEntitlementShim'
import {
    IMembershipBase as IMembershipBaseV3,
    IArchitectBase as ISpaceArchitectBaseV3,
} from './v3/ISpaceArchitectShim'
import { IRolesBase as IRolesBaseV3 } from './v3/IRolesShim'
import { RuleEntitlementShim } from './v3/RuleEntitlementShim'
import { IRuleEntitlement } from './v3'
import { IPricingModulesBase } from './v3/IPricingShim'

export const Permission = {
    Undefined: 'Undefined', // No permission required
    Read: 'Read',
    Write: 'Write',
    Invite: 'Invite',
    JoinSpace: 'JoinSpace',
    Redact: 'Redact',
    Ban: 'Ban',
    PinMessage: 'PinMessage',
    AddRemoveChannels: 'AddRemoveChannels',
    ModifySpaceSettings: 'ModifySpaceSettings',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]

export type EntitlementShim = UserEntitlementShimV3 | RuleEntitlementShim

export type EntitlementStruct = IRolesBaseV3.CreateEntitlementStruct

type UserEntitlementShim = UserEntitlementShimV3

type MembershipInfoStruct = IMembershipBaseV3.MembershipStruct

type TotalSupplyOutputStruct = { totalSupply: number }

export type MembershipStruct = ISpaceArchitectBaseV3.MembershipStruct

export type SpaceInfoStruct = ISpaceArchitectBaseV3.SpaceInfoStruct

export type PricingModuleStruct = IPricingModulesBase.PricingModuleStruct

/**
 * Supported entitlement modules
 */
export enum EntitlementModuleType {
    UserEntitlement = 'UserEntitlement',
    RuleEntitlement = 'RuleEntitlement',
}

/**
 * Role details from multiple contract sources
 */
export interface RoleDetails {
    id: number
    name: string
    permissions: Permission[]
    users: string[]
    ruleData: IRuleEntitlement.RuleDataStruct
    channels: ChannelMetadata[]
}

/**
 * Basic channel metadata from the space contract.
 */
export interface ChannelMetadata {
    name: string
    description?: string
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
    users: string[]
    ruleData: IRuleEntitlement.RuleDataStruct
}

/*
    Decoded Token and User entitlenment details
*/
export interface EntitlementDetails {
    users: string[]
    ruleData: IRuleEntitlement.RuleDataStruct
}

export interface BasicRoleInfo {
    roleId: number
    name: string
}

export interface EntitlementModule {
    moduleType: EntitlementModuleType
}

export function isUserEntitlement(
    entitlement: EntitlementModule,
): entitlement is UserEntitlementShim {
    return entitlement.moduleType === EntitlementModuleType.UserEntitlement
}

export function isRuleEntitlement(
    entitlement: EntitlementModule,
): entitlement is RuleEntitlementShim {
    return entitlement.moduleType === EntitlementModuleType.RuleEntitlement
}

export function isStringArray(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any,
): args is string[] {
    return Array.isArray(args) && args.length > 0 && args.every((arg) => typeof arg === 'string')
}

export type MembershipInfo = Pick<
    MembershipInfoStruct,
    'maxSupply' | 'currency' | 'feeRecipient' | 'price' | 'duration' | 'pricingModule'
> &
    TotalSupplyInfo

export type TotalSupplyInfo = Pick<TotalSupplyOutputStruct, 'totalSupply'>

export type Address = `0x${string}`
