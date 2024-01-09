import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    TDefaultVersion,
    ExternalTokenStruct,
    MembershipInfo,
    MembershipStruct,
    Permission,
    RoleDetails,
    Versions,
    TotalSupplyInfo,
} from './ContractTypes'

import { SpaceInfo } from './SpaceInfo'
import { WalletLink as WalletLinkV3 } from './v3/WalletLink'
import { WalletLink as WalletLinkV4 } from './v4/WalletLink'
import { WalletClient, Address, PublicClient } from 'viem'
import { ContractTransaction, ethers } from 'ethers'
import { SpaceDappTransaction as SpaceDappV4Transaction } from './v4'
import { PaymasterConfig, UserOpParams } from './UserOpTypes'
import { Town } from './v3'
import { ISendUserOperationResponse, Client as UseropClient } from 'userop'

export type SignerType<V extends Versions = TDefaultVersion> = V extends 'v3'
    ? ethers.Signer
    : WalletClient
export interface EventsContractInfo {
    abi: ethers.ContractInterface
    address: string
}

export interface CreateSpaceParams<V extends Versions = TDefaultVersion> {
    spaceId: string
    spaceName: string
    spaceMetadata: string
    channelId: string
    channelName: string
    membership: MembershipStruct<V>
}

export interface UpdateChannelParams {
    spaceId: string
    channelId: string
    channelName: string
    roleIds: number[]
    disabled?: boolean
}

export interface UpdateRoleParams<V extends Versions = TDefaultVersion> {
    spaceNetworkId: string
    roleId: number
    roleName: string
    permissions: Permission[]
    tokens: ExternalTokenStruct<V>[]
    users: string[]
}

type TransactionType<V extends Versions> = V extends 'v3'
    ? ContractTransaction
    : SpaceDappV4Transaction

export type UserOperationResponse = ISendUserOperationResponse

type StringOrAddress<V extends Versions> = V extends 'v3' ? string : Address

export interface ISpaceDapp<V extends Versions = TDefaultVersion> {
    provider: (V extends 'v3' ? ethers.providers.Provider : PublicClient) | undefined
    addRoleToChannel: (
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        signer: SignerType<V>,
    ) => Promise<TransactionType<V>>
    createSpace: (
        params: CreateSpaceParams<V>,
        signer: SignerType<V>,
    ) => Promise<TransactionType<V>>
    createChannel: (
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: SignerType<V>,
    ) => Promise<TransactionType<V>>
    createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: ExternalTokenStruct<V>[],
        users: string[],
        signer: SignerType<V>,
    ): Promise<TransactionType<V>>
    deleteRole(spaceId: string, roleId: number, signer: SignerType<V>): Promise<TransactionType<V>>
    getChannels: (spaceId: string) => Promise<ChannelMetadata[]>
    getChannelDetails: (spaceId: string, channelId: string) => Promise<ChannelDetails<V> | null>
    getPermissionsByRoleId: (spaceId: string, roleId: number) => Promise<Permission[]>
    getRole: (spaceId: string, roleId: number) => Promise<RoleDetails<V> | null>
    getRoles: (spaceId: string) => Promise<BasicRoleInfo[]>
    getSpaceInfo: (spaceId: string) => Promise<SpaceInfo | undefined>
    isEntitledToSpace: (
        spaceId: string,
        user: StringOrAddress<V>,
        permission: Permission,
    ) => Promise<boolean>
    isEntitledToChannel: (
        spaceId: string,
        channelId: string,
        user: StringOrAddress<V>,
        permission: Permission,
    ) => Promise<boolean>
    parseSpaceFactoryError: (error: unknown) => Error
    parseSpaceError: (spaceId: string, error: unknown) => Promise<Error>
    updateChannel: (
        params: UpdateChannelParams,
        signer: SignerType<V>,
    ) => Promise<TransactionType<V>>
    updateRole: (params: UpdateRoleParams<V>, signer: SignerType<V>) => Promise<TransactionType<V>>
    updateSpaceName: (
        spaceId: string,
        name: string,
        signer: SignerType<V>,
    ) => Promise<TransactionType<V>>
    setSpaceAccess: (
        spaceId: string,
        disabled: boolean,
        signer: SignerType<V>,
    ) => Promise<TransactionType<V>>
    setChannelAccess: (
        spaceId: string,
        channelId: string,
        disabled: boolean,
        signer: SignerType<V>,
    ) => Promise<TransactionType<V>>
    getTownMembershipTokenAddress: (spaceId: string) => Promise<string>
    joinTown: (
        spaceId: string,
        recipient: StringOrAddress<V>,
        signer: SignerType<V>,
    ) => Promise<TransactionType<V>>
    hasTownMembership: (spaceId: string, wallet: StringOrAddress<V>) => Promise<boolean>
    getMembershipSupply: (spaceId: string) => Promise<TotalSupplyInfo<V>>
    getMembershipInfo: (spaceId: string) => Promise<MembershipInfo<V>>
    getWalletLink: () => V extends 'v3' ? WalletLinkV3 : WalletLinkV4
}

export interface IUseropSpaceDapp<V extends Versions = TDefaultVersion> extends ISpaceDapp<V> {
    getAbstractAccountAddress: (args: UserOpParams) => Promise<string>
    getTown: (spaceId: string) => Promise<Town>
    sendUserOp: (args: UserOpParams) => Promise<ISendUserOperationResponse>
    getUserOpClient: () => Promise<UseropClient>
    sendCreateSpaceOp: (
        args: Parameters<ISpaceDapp['createSpace']>,
        paymasterConfig?: PaymasterConfig,
    ) => Promise<ISendUserOperationResponse>
    sendJoinTownOp: (
        args: Parameters<ISpaceDapp['joinTown']>,
        paymasterConfig?: PaymasterConfig,
    ) => Promise<ISendUserOperationResponse>
    sendFunds: (args: {
        signer: SignerType<V>
        recipient: string
        value: ethers.BigNumberish
    }) => Promise<ISendUserOperationResponse>
    mintMockNFT: (args: {
        signer: SignerType<V>
        recipient: string
    }) => Promise<ISendUserOperationResponse>
}
