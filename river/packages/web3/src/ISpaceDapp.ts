import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    MembershipInfo,
    MembershipStruct,
    Permission,
    PricingModuleStruct,
    RoleDetails,
    TotalSupplyInfo,
} from './ContractTypes'

import { WalletLink as WalletLinkV3 } from './v3/WalletLink'
import { BigNumber, BytesLike, ContractReceipt, ContractTransaction, ethers } from 'ethers'
import { SpaceInfo } from './types'
import { IRolesBase, Space, SpaceRegistrar, IRuleEntitlement } from './v3'
import { PricingModules } from './v3/PricingModules'
import { IPrepayShim } from './v3/IPrepayShim'
import { BaseChainConfig } from './IStaticContractsInfo'
import { PlatformRequirements } from './v3/PlatformRequirements'

export type SignerType = ethers.Signer

export interface CreateSpaceParams {
    spaceName: string
    spaceMetadata: string
    channelName: string
    membership: MembershipStruct
}

export interface UpdateChannelParams {
    spaceId: string
    channelId: string
    channelName: string
    channelDescription: string
    roleIds: number[]
    disabled?: boolean
}

export interface UpdateRoleParams {
    spaceNetworkId: string
    roleId: number
    roleName: string
    permissions: Permission[]
    users: string[]
    ruleData: IRuleEntitlement.RuleDataStruct
}

export interface TransactionOpts {
    retryCount?: number
}

type TransactionType = ContractTransaction

export type ContractEventListener = {
    wait: () => Promise<{
        success: boolean
        error?: Error | undefined
        [x: string]: unknown
    }>
}

export interface ISpaceDapp {
    readonly provider: ethers.providers.Provider
    readonly config: BaseChainConfig
    readonly spaceRegistrar: SpaceRegistrar
    readonly walletLink: WalletLinkV3
    readonly pricingModules: PricingModules
    readonly prepay: IPrepayShim
    readonly platformRequirements: PlatformRequirements
    addRoleToChannel: (
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        signer: SignerType,
    ) => Promise<TransactionType>
    banWalletAddress: (
        spaceId: string,
        walletAddress: string,
        signer: SignerType,
    ) => Promise<TransactionType>
    unbanWalletAddress: (
        spaceId: string,
        walletAddress: string,
        signer: SignerType,
    ) => Promise<TransactionType>
    walletAddressIsBanned: (spaceId: string, walletAddress: string) => Promise<boolean>
    bannedWalletAddresses: (spaceId: string) => Promise<string[]>
    createSpace: (
        params: CreateSpaceParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    createChannel: (
        spaceId: string,
        channelName: string,
        channelDescription: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlement.RuleDataStruct,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ): Promise<TransactionType>
    createUpdatedEntitlements(
        space: Space,
        params: UpdateRoleParams,
    ): Promise<IRolesBase.CreateEntitlementStruct[]>
    deleteRole(
        spaceId: string,
        roleId: number,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ): Promise<TransactionType>
    encodedUpdateChannelData(space: Space, params: UpdateChannelParams): Promise<BytesLike[]>
    getChannels: (spaceId: string) => Promise<ChannelMetadata[]>
    getChannelDetails: (spaceId: string, channelId: string) => Promise<ChannelDetails | null>
    getPermissionsByRoleId: (spaceId: string, roleId: number) => Promise<Permission[]>
    getRole: (spaceId: string, roleId: number) => Promise<RoleDetails | null>
    getRoles: (spaceId: string) => Promise<BasicRoleInfo[]>
    getSpaceInfo: (spaceId: string) => Promise<SpaceInfo | undefined>
    isEntitledToSpace: (spaceId: string, user: string, permission: Permission) => Promise<boolean>
    isEntitledToChannel: (
        spaceId: string,
        channelId: string,
        user: string,
        permission: Permission,
    ) => Promise<boolean>
    getEntitledWalletForJoiningSpace: (
        spaceId: string,
        wallet: string,
        supportedXChainRpcUrls: string[],
    ) => Promise<string | undefined>
    parseAllContractErrors: (args: { spaceId?: string; error: unknown }) => Error
    parseSpaceFactoryError: (error: unknown) => Error
    parseSpaceError: (spaceId: string, error: unknown) => Error
    parsePrepayError: (error: unknown) => Error
    parseSpaceLogs: (
        spaceId: string,
        logs: ethers.providers.Log[],
    ) => Promise<(ethers.utils.LogDescription | undefined)[]>
    updateChannel: (
        params: UpdateChannelParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    updateRole: (
        params: UpdateRoleParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    updateSpaceName: (
        spaceId: string,
        name: string,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    setSpaceAccess: (
        spaceId: string,
        disabled: boolean,
        signer: SignerType,
    ) => Promise<TransactionType>
    setChannelAccess: (
        spaceId: string,
        channelId: string,
        disabled: boolean,
        signer: SignerType,
    ) => Promise<TransactionType>
    getSpace(spaceId: string): Space | undefined
    getSpaceMembershipTokenAddress: (spaceId: string) => Promise<string>
    joinSpace: (
        spaceId: string,
        recipient: string,
        signer: SignerType,
    ) => Promise<{ issued: true; tokenId: string } | { issued: false; tokenId: undefined }>
    hasSpaceMembership: (spaceId: string, wallet: string) => Promise<boolean>
    getMembershipSupply: (spaceId: string) => Promise<TotalSupplyInfo>
    getMembershipInfo: (spaceId: string) => Promise<MembershipInfo>
    getWalletLink: () => WalletLinkV3
    getSpaceAddress: (receipt: ContractReceipt) => string | undefined
    listPricingModules: () => Promise<PricingModuleStruct[]>
    setMembershipPrice: (
        spaceId: string,
        price: string,
        signer: SignerType,
    ) => Promise<TransactionType>
    setMembershipPricingModule: (
        spaceId: string,
        moduleId: string,
        signer: SignerType,
    ) => Promise<TransactionType>
    setMembershipLimit: (
        spaceId: string,
        limit: number,
        signer: SignerType,
    ) => Promise<TransactionType>
    prepayMembership: (
        spaceId: string,
        supply: number,
        signer: SignerType,
    ) => Promise<TransactionType>
    getPrepaidMembershipSupply: (spaceId: string) => Promise<BigNumber>
    setMembershipFreeAllocation: (
        spaceId: string,
        freeAllocation: number,
        signer: SignerType,
    ) => Promise<TransactionType>
    listenForMembershipEvent: (
        spaceId: string,
        receiver: string,
        abortController?: AbortController,
    ) => Promise<{ issued: true; tokenId: string } | { issued: false; tokenId: undefined }>
}
