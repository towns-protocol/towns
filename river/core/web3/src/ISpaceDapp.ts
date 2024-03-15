import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    MembershipInfo,
    MembershipStruct,
    Permission,
    RoleDetails,
    TotalSupplyInfo,
} from './ContractTypes'

import { WalletLink as WalletLinkV3 } from './v3/WalletLink'
import { BytesLike, ContractReceipt, ContractTransaction, ethers } from 'ethers'
import { SpaceInfo } from './SpaceDappTypes'
import { IRolesBase, Town, TownRegistrar, IRuleEntitlement } from './v3'

export type SignerType = ethers.Signer
export interface EventsContractInfo {
    abi: ethers.ContractInterface
    address: string
}

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

type TransactionType = ContractTransaction

export interface ISpaceDapp {
    readonly chainId: number
    readonly provider: ethers.providers.Provider | undefined
    readonly townRegistrar: TownRegistrar
    readonly walletLink: WalletLinkV3
    addRoleToChannel: (
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        signer: SignerType,
    ) => Promise<TransactionType>
    createSpace: (params: CreateSpaceParams, signer: SignerType) => Promise<TransactionType>
    createChannel: (
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: SignerType,
    ) => Promise<TransactionType>
    createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlement.RuleDataStruct,
        signer: SignerType,
    ): Promise<TransactionType>
    createUpdatedEntitlements(
        town: Town,
        params: UpdateRoleParams,
    ): Promise<IRolesBase.CreateEntitlementStruct[]>
    deleteRole(spaceId: string, roleId: number, signer: SignerType): Promise<TransactionType>
    encodedUpdateChannelData(town: Town, params: UpdateChannelParams): Promise<BytesLike[]>
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
    parseSpaceFactoryError: (error: unknown) => Error
    parseSpaceError: (spaceId: string, error: unknown) => Promise<Error>
    parseSpaceLogs: (
        spaceId: string,
        logs: ethers.providers.Log[],
    ) => Promise<(ethers.utils.LogDescription | undefined)[]>
    updateChannel: (params: UpdateChannelParams, signer: SignerType) => Promise<TransactionType>
    updateRole: (params: UpdateRoleParams, signer: SignerType) => Promise<TransactionType>
    updateSpaceName: (spaceId: string, name: string, signer: SignerType) => Promise<TransactionType>
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
    getTown(townId: string): Promise<Town | undefined>
    getTownMembershipTokenAddress: (spaceId: string) => Promise<string>
    joinTown: (spaceId: string, recipient: string, signer: SignerType) => Promise<TransactionType>
    hasTownMembership: (spaceId: string, wallet: string) => Promise<boolean>
    getMembershipSupply: (spaceId: string) => Promise<TotalSupplyInfo>
    getMembershipInfo: (spaceId: string) => Promise<MembershipInfo>
    getWalletLink: () => WalletLinkV3
    getSpaceAddress: (receipt: ContractReceipt) => string | undefined
}
