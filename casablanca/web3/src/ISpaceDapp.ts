import {
    Address,
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    ExternalTokenStruct,
    MembershipInfo,
    MembershipStruct,
    Permission,
    RoleDetails,
    TotalSupplyInfo,
} from './ContractTypes'

import { WalletLink as WalletLinkV3 } from './v3/WalletLink'
import { ContractTransaction, ethers } from 'ethers'
import { PaymasterConfig, UserOpParams, SpaceInfo } from './SpaceDappTypes'
import { ISendUserOperationResponse, Client as UseropClient } from 'userop'

export type SignerType = ethers.Signer
export interface EventsContractInfo {
    abi: ethers.ContractInterface
    address: string
}

export interface CreateSpaceParams {
    spaceId: string
    spaceName: string
    spaceMetadata: string
    channelId: string
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
    tokens: ExternalTokenStruct[]
    users: string[]
}

type TransactionType = ContractTransaction

export type UserOperationResponse = ISendUserOperationResponse

export interface ISpaceDapp {
    provider: ethers.providers.Provider | undefined
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
        tokens: ExternalTokenStruct[],
        users: string[],
        signer: SignerType,
    ): Promise<TransactionType>
    deleteRole(spaceId: string, roleId: number, signer: SignerType): Promise<TransactionType>
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
    getTownMembershipTokenAddress: (spaceId: string) => Promise<string>
    joinTown: (spaceId: string, recipient: string, signer: SignerType) => Promise<TransactionType>
    hasTownMembership: (spaceId: string, wallet: string) => Promise<boolean>
    getMembershipSupply: (spaceId: string) => Promise<TotalSupplyInfo>
    getMembershipInfo: (spaceId: string) => Promise<MembershipInfo>
    getWalletLink: () => WalletLinkV3

    // userop related
    getAbstractAccountAddress: (args: Pick<UserOpParams, 'signer'>) => Promise<Address>
    getUserOpClient: () => Promise<UseropClient>
    sendUserOp: (
        args: UserOpParams & {
            functionHashForPaymasterProxy: string
            townId: string
        },
    ) => Promise<ISendUserOperationResponse>
    sendCreateSpaceOp: (
        args: Parameters<ISpaceDapp['createSpace']>,
        paymasterConfig?: PaymasterConfig,
    ) => Promise<ISendUserOperationResponse>
    sendJoinTownOp: (
        args: Parameters<ISpaceDapp['joinTown']>,
        paymasterConfig?: PaymasterConfig,
    ) => Promise<ISendUserOperationResponse>
}
