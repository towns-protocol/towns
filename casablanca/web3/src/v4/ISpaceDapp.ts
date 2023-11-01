import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    Permission,
    RoleDetails,
} from './ContractTypesV4'

import { SpaceInfo } from '../SpaceInfo'
import { ITownArchitectBase } from '../v4/ITownArchitectShim'

import { Abi, Transaction, WalletClient, Transport, Chain } from 'viem'
import { SpaceDappTransaction, ViemExternalTokenStruct } from './types'

export interface EventsContractInfo {
    abi: Abi
    address: string
}

export interface CreateSpaceParams {
    spaceId: string
    spaceName: string
    spaceMetadata: string
    channelId: string
    channelName: string
    membership: ITownArchitectBase['MembershipStruct']
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
    tokens: ViemExternalTokenStruct[]
    users: string[]
}

export interface ISpaceDapp<T extends Transport, C extends Chain> {
    addRoleToChannel: (
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        wallet: WalletClient<T, C>,
    ) => Promise<SpaceDappTransaction>
    createSpace: (
        params: CreateSpaceParams,
        wallet: WalletClient<T, C>,
    ) => Promise<SpaceDappTransaction>
    createChannel: (
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: WalletClient<T, C>,
    ) => Promise<Transaction>
    createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: ViemExternalTokenStruct[],
        users: string[],
        signer: WalletClient<T, C>,
    ): Promise<Transaction>
    deleteRole(spaceId: string, roleId: number, signer: WalletClient<T, C>): Promise<Transaction>
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
    updateChannel: (params: UpdateChannelParams, signer: WalletClient<T, C>) => Promise<Transaction>
    updateRole: (params: UpdateRoleParams, signer: WalletClient<T, C>) => Promise<Transaction>
    setSpaceAccess: (
        spaceId: string,
        disabled: boolean,
        signer: WalletClient<T, C>,
    ) => Promise<Transaction>
    setChannelAccess: (
        spaceId: string,
        channelId: string,
        disabled: boolean,
        signer: WalletClient<T, C>,
    ) => Promise<Transaction>
}
