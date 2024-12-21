import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    MembershipInfo,
    LegacyMembershipStruct,
    MembershipStruct,
    Permission,
    PricingModuleStruct,
    RoleDetails,
    TotalSupplyInfo,
} from './ContractTypes'
import { XchainConfig } from './entitlement'

import { WalletLink as WalletLinkV3 } from './v3/WalletLink'
import { BigNumber, BytesLike, ContractReceipt, ContractTransaction, ethers } from 'ethers'
import { SpaceInfo } from './types'
import {
    IRolesBase,
    Space,
    SpaceRegistrar,
    IRuleEntitlementBase,
    IRuleEntitlementV2Base,
    RiverAirdropDapp,
} from './v3'
import { PricingModules } from './v3/PricingModules'
import { BaseChainConfig } from './IStaticContractsInfo'
import { PlatformRequirements } from './v3/PlatformRequirements'
import { TipEventObject } from '@river-build/generated/dev/typings/ITipping'

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
    prepaySupply?: number
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
    readonly platformRequirements: PlatformRequirements
    readonly airdrop: RiverAirdropDapp | undefined

    isLegacySpace: (spaceId: string) => Promise<boolean>
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
    createLegacySpace: (
        params: CreateLegacySpaceParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
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
    createChannelWithPermissionOverrides: (
        spaceId: string,
        channelName: string,
        channelDescription: string,
        channelNetworkId: string,
        roles: { roleId: number; permissions: Permission[] }[],
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    legacyCreateRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementBase.RuleDataStruct,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ): Promise<TransactionType>
    createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ): Promise<TransactionType>
    waitForRoleCreated(
        spaceId: string,
        txn: ContractTransaction,
    ): Promise<{ roleId: number | undefined; error: Error | undefined }>
    createLegacyUpdatedEntitlements(
        space: Space,
        params: LegacyUpdateRoleParams,
    ): Promise<IRolesBase.CreateEntitlementStruct[]>
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
    refreshMetadata(
        spaceId: string,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction>
    encodedUpdateChannelData(space: Space, params: UpdateChannelParams): Promise<BytesLike[]>
    getChannels: (spaceId: string) => Promise<ChannelMetadata[]>
    getChannelDetails: (spaceId: string, channelId: string) => Promise<ChannelDetails | null>
    getPermissionsByRoleId: (spaceId: string, roleId: number) => Promise<Permission[]>
    getChannelPermissionOverrides(
        spaceId: string,
        roleId: number,
        channelId: string,
    ): Promise<Permission[]>
    getRole: (spaceId: string, roleId: number) => Promise<RoleDetails | null>
    getRoles: (spaceId: string) => Promise<BasicRoleInfo[]>
    getSpaceInfo: (spaceId: string) => Promise<SpaceInfo | undefined>
    isEntitledToSpace: (spaceId: string, user: string, permission: Permission) => Promise<boolean>
    isEntitledToChannel: (
        spaceId: string,
        channelId: string,
        user: string,
        permission: Permission,
        xchainConfig: XchainConfig,
    ) => Promise<boolean>
    getEntitledWalletForJoiningSpace: (
        spaceId: string,
        wallet: string,
        xchainConfig: XchainConfig,
    ) => Promise<string | undefined>
    parseAllContractErrors: (args: { spaceId?: string; error: unknown }) => Error
    parseSpaceFactoryError: (error: unknown) => Error
    parseSpaceError: (spaceId: string, error: unknown) => Error
    parseSpaceLogs: (
        spaceId: string,
        logs: ethers.providers.Log[],
    ) => Promise<(ethers.utils.LogDescription | undefined)[]>
    updateChannel: (
        params: UpdateChannelParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    removeChannel: (
        params: RemoveChannelParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    legacyUpdateRole: (
        params: LegacyUpdateRoleParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    updateRole: (
        params: UpdateRoleParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    setChannelPermissionOverrides: (
        params: SetChannelPermissionOverridesParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    clearChannelPermissionOverrides: (
        params: ClearChannelPermissionOverridesParams,
        signer: SignerType,
        txnOpts?: TransactionOpts,
    ) => Promise<TransactionType>
    updateSpaceInfo: (
        spaceId: string,
        name: string,
        uri: string,
        shortDescription: string,
        longDescription: string,
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
    getJoinSpacePriceDetails: (spaceId: string) => Promise<{
        price: ethers.BigNumber
        prepaidSupply: ethers.BigNumber
        remainingFreeSupply: ethers.BigNumber
    }>
    joinSpace: (
        spaceId: string,
        recipient: string,
        signer: SignerType,
    ) => Promise<{ issued: true; tokenId: string } | { issued: false; tokenId: undefined }>
    hasSpaceMembership: (spaceId: string, wallet: string) => Promise<boolean>
    getMembershipSupply: (spaceId: string) => Promise<TotalSupplyInfo>
    getMembershipInfo: (spaceId: string) => Promise<MembershipInfo>
    getWalletLink: () => WalletLinkV3
    getSpaceAddress: (receipt: ContractReceipt, senderAddress: string) => string | undefined
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
    getMembershipFreeAllocation: (spaceId: string) => Promise<BigNumber>
    withdrawSpaceFunds: (
        spaceId: string,
        recipient: string,
        signer: SignerType,
    ) => Promise<TransactionType>
    tip: (
        args: {
            spaceId: string
            tokenId: string
            currency: string
            amount: bigint
            messageId: string
            channelId: string
        },
        signer: SignerType,
    ) => Promise<TransactionType>
    getLinkedWallets: (wallet: string) => Promise<string[]>
    getTokenIdOfOwner: (spaceId: string, owner: string) => Promise<string | undefined>
    getTipEvent: (
        spaceId: string,
        receipt: ContractReceipt,
        senderAddress: string,
    ) => TipEventObject | undefined
}
