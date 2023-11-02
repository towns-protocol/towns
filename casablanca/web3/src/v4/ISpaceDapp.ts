import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    Permission,
    RoleDetails,
} from './ContractTypes'

import { SpaceInfo } from '../SpaceInfo'

import { Abi, WalletClient, Address } from 'viem'
import { ITownArchitectBase, SpaceDappTransaction, TokenEntitlementDataTypes } from './types'

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
    tokens: TokenEntitlementDataTypes['ExternalTokenStruct'][]
    users: Address[]
}

export interface ISpaceDapp {
    addRoleToChannel: (
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        wallet: WalletClient,
    ) => Promise<SpaceDappTransaction>
    createSpace: (params: CreateSpaceParams, wallet: WalletClient) => Promise<SpaceDappTransaction>
    createChannel: (
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        wallet: WalletClient,
    ) => Promise<SpaceDappTransaction>
    createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes['ExternalTokenStruct'][],
        users: string[],
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction>
    deleteRole(spaceId: string, roleId: number, wallet: WalletClient): Promise<SpaceDappTransaction>
    getChannels: (spaceId: string) => Promise<ChannelMetadata[]>
    getChannelDetails: (spaceId: string, channelId: string) => Promise<ChannelDetails | null>
    getPermissionsByRoleId: (spaceId: string, roleId: number) => Promise<Permission[]>
    getRole: (spaceId: string, roleId: number) => Promise<RoleDetails | null>
    getRoles: (spaceId: string) => Promise<BasicRoleInfo[]>
    getSpaceInfo: (spaceId: string) => Promise<SpaceInfo | undefined>
    isEntitledToSpace: (spaceId: string, user: Address, permission: Permission) => Promise<boolean>
    isEntitledToChannel: (
        spaceId: string,
        channelId: string,
        user: Address,
        permission: Permission,
    ) => Promise<boolean>
    parseSpaceFactoryError: (error: unknown) => Error
    parseSpaceError: (spaceId: string, error: unknown) => Promise<Error>
    updateChannel: (
        params: UpdateChannelParams,
        wallet: WalletClient,
    ) => Promise<SpaceDappTransaction>
    updateRole: (params: UpdateRoleParams, wallet: WalletClient) => Promise<SpaceDappTransaction>
    setSpaceAccess: (
        spaceId: string,
        disabled: boolean,
        wallet: WalletClient,
    ) => Promise<SpaceDappTransaction>
    setChannelAccess: (
        spaceId: string,
        channelId: string,
        disabled: boolean,
        wallet: WalletClient,
    ) => Promise<SpaceDappTransaction>
}
