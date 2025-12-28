import { UserEntitlementShim as UserEntitlementShimV3 } from '../space/entitlements/UserEntitlementShim'
import {
    IMembershipBase as IMembershipBaseV3,
    IArchitectBase as ISpaceArchitectBaseV3,
} from '../space-registrar/ICreateSpaceShim'
import { ILegacyArchitectBase } from '../space-registrar/ILegacySpaceArchitectShim'
import { IRolesBase as IRolesBaseV3 } from '../space/IRolesShim'
import {
    RuleEntitlementShim,
    IRuleEntitlementBase,
} from '../space/entitlements/RuleEntitlementShim'
import {
    IRuleEntitlementV2Base,
    RuleEntitlementV2Shim,
} from '../space/entitlements/RuleEntitlementV2Shim'
import { IPricingModulesBase } from '../pricing-modules/IPricingShim'

import { NoopRuleData } from '../space/entitlements/entitlement'

import { ethers } from 'ethers'

export const Permission = {
    /** No permission required. */
    Undefined: 'Undefined',
    /** Read event permission. */
    Read: 'Read',
    /** Write event permission. */
    Write: 'Write',
    /** Invite user permission. */
    Invite: 'Invite',
    /** Join space permission. */
    JoinSpace: 'JoinSpace',
    /** Redact events permission. */
    Redact: 'Redact',
    /** Modify or ban user permission. */
    ModifyBanning: 'ModifyBanning',
    /** Pin/unpin events permission. */
    PinMessage: 'PinMessage',
    /** Add or remove channels permission. */
    AddRemoveChannels: 'AddRemoveChannels',
    /** Modify space settings permission. */
    ModifySpaceSettings: 'ModifySpaceSettings',
    /** React to a message permission. */
    React: 'React',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]

export type EntitlementShim = UserEntitlementShimV3 | RuleEntitlementShim | RuleEntitlementV2Shim

export type EntitlementStruct = IRolesBaseV3.CreateEntitlementStruct

type UserEntitlementShim = UserEntitlementShimV3

type MembershipInfoStruct = IMembershipBaseV3.MembershipStruct

type TotalSupplyOutputStruct = { totalSupply: number }

export type MembershipStruct = ISpaceArchitectBaseV3.MembershipStruct

export type LegacyMembershipStruct = ILegacyArchitectBase.MembershipStruct

export type MembershipRequirementsStruct = ISpaceArchitectBaseV3.MembershipRequirementsStruct

export type LegacyMembershipRequirementsStruct = ILegacyArchitectBase.MembershipRequirementsStruct

export type SpaceInfoStruct = ISpaceArchitectBaseV3.SpaceInfoStruct

export type LegacySpaceInfoStruct = ILegacyArchitectBase.SpaceInfoStruct

export type PricingModuleStruct = IPricingModulesBase.PricingModuleStruct

/**
 * Supported entitlement modules
 */
export enum EntitlementModuleType {
    UserEntitlement = 'UserEntitlement',
    RuleEntitlement = 'RuleEntitlement',
    RuleEntitlementV2 = 'RuleEntitlementV2',
}

export function isLegacyMembershipType(
    object: MembershipStruct | LegacyMembershipStruct,
): object is LegacyMembershipStruct {
    return typeof object.requirements.ruleData === typeof NoopRuleData
}

export function isCreateLegacySpaceParams(
    object: CreateSpaceParams | CreateLegacySpaceParams,
): object is CreateLegacySpaceParams {
    return typeof object.membership.requirements.ruleData === typeof NoopRuleData
}

export function isRuleDataV1(
    ruleData: IRuleEntitlementBase.RuleDataStruct | IRuleEntitlementV2Base.RuleDataV2Struct,
): ruleData is IRuleEntitlementBase.RuleDataStruct {
    return ruleData.checkOperations.length === 0 || 'threshold' in ruleData.checkOperations[0]
}

/**
 * Role details from multiple contract sources
 */

interface RuleDataV1 {
    kind: 'v1'
    rules: IRuleEntitlementBase.RuleDataStruct
}
interface RuleDataV2 {
    kind: 'v2'
    rules: IRuleEntitlementV2Base.RuleDataV2Struct
}

export type VersionedRuleData = RuleDataV1 | RuleDataV2

export interface RoleDetails {
    id: number
    name: string
    permissions: Permission[]
    users: string[]
    ruleData: VersionedRuleData
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
    /** The River `spaceId` which this channel belongs. */
    spaceNetworkId: string
    /** The River `channelId` of the channel. */
    channelNetworkId: string
    /** The name of the channel. */
    name: string
    /** Whether the channel is disabled. */
    disabled: boolean
    /** The roles defined for the channel {@link RoleEntitlements}. */
    roles: RoleEntitlements[]
    /** The description of the channel. */
    description?: string
}

/** Role details for a channel from multiple contract sources */
export interface RoleEntitlements {
    /** The id of the role. */
    roleId: number
    /** The name of the role. */
    name: string
    /** The permissions that this role has. @see {@link Permission} */
    permissions: Permission[]
    /** The userIds that are in this role. */
    users: string[]
    /** @internal The River struct that represents the rule data of the role {@link VersionedRuleData}. */
    ruleData: VersionedRuleData
}

/*
    Decoded Token and User entitlenment details
*/
export interface EntitlementDetails {
    users: string[]
    ruleData: VersionedRuleData
}

export interface BasicRoleInfo {
    roleId: number
    name: string
}

export interface EntitlementModule {
    moduleType: EntitlementModuleType
}

export function isPermission(permission: string): permission is Permission {
    return Object.values(Permission).includes(permission as Permission)
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

export function isRuleEntitlementV2(
    entitlement: EntitlementModule,
): entitlement is RuleEntitlementV2Shim {
    return entitlement.moduleType === EntitlementModuleType.RuleEntitlementV2
}

export const isUpdateChannelStatusParams = (
    params: UpdateChannelParams,
): params is UpdateChannelAccessParams => {
    return (
        'disabled' in params &&
        !('roleIds' in params || 'channelName' in params || 'channelDescription' in params)
    )
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
    TotalSupplyInfo & {
        remainingFreeSupply: number
    }

export type TotalSupplyInfo = Pick<TotalSupplyOutputStruct, 'totalSupply'>

export type Address = `0x${string}`

export type SignerType = ethers.Signer

export interface CreateLegacySpaceParams {
    spaceName: string
    uri: string
    channelName: string
    membership: LegacyMembershipStruct
    shortDescription?: string
    longDescription?: string
}

export interface CreateSpaceParams {
    spaceName: string
    uri: string
    channelName: string
    membership: MembershipStruct
    shortDescription?: string
    longDescription?: string
}

export interface UpdateChannelMetadataParams {
    spaceId: string
    channelId: string
    channelName: string
    channelDescription: string
    roleIds: number[]
    disabled?: boolean
}

export interface UpdateChannelAccessParams {
    spaceId: string
    channelId: string
    disabled: boolean
}

export type UpdateChannelParams = UpdateChannelMetadataParams | UpdateChannelAccessParams

export interface RemoveChannelParams {
    spaceId: string
    channelId: string
}

export interface LegacyUpdateRoleParams {
    spaceNetworkId: string
    roleId: number
    roleName: string
    permissions: Permission[]
    users: string[]
    ruleData: IRuleEntitlementBase.RuleDataStruct
}

export interface UpdateRoleParams {
    spaceNetworkId: string
    roleId: number
    roleName: string
    permissions: Permission[]
    users: string[]
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct
}

export interface SetChannelPermissionOverridesParams {
    spaceNetworkId: string
    channelId: string
    roleId: number
    permissions: Permission[]
}

export interface ClearChannelPermissionOverridesParams {
    spaceNetworkId: string
    channelId: string
    roleId: number
}

export interface TransactionOpts {
    retryCount?: number
}

export type SendTipMemberParams = {
    tokenId: string
    spaceId: string
    receiver: Address
    currency: Address
    amount: bigint
    // Used for nodes to validate tip event
    messageId: string
    channelId: string
}

export type SendTipBotParams = {
    appId: string
    spaceId: string
    receiver: Address
    currency: Address
    amount: bigint
    // Used for nodes to validate tip event
    messageId: string
    channelId: string
}

export type SendTipAnyParams = {
    receiver: Address
    currency: Address
    amount: bigint
    // Used for nodes to validate tip event
    messageId: string
    channelId: string
}

export type SendTipParams =
    | ({ type: 'member' } & SendTipMemberParams)
    | ({ type: 'bot' } & SendTipBotParams)
    | ({ type: 'any' } & SendTipAnyParams)
