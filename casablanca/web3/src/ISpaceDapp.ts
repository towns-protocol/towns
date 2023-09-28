import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    Permission,
    RoleDetails,
} from './ContractTypes'
import { ContractTransaction, ethers } from 'ethers'

import { SpaceInfo } from './SpaceInfo'
import { TokenEntitlementDataTypes } from './v3/TokenEntitlementShim'
import { ITownArchitectBase } from './v3/ITownArchitectShim'

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
    memberEntitlements: ITownArchitectBase.MemberEntitlementStruct
    everyonePermissions: string[]
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
    tokens: TokenEntitlementDataTypes.ExternalTokenStruct[]
    users: string[]
}

export interface ISpaceDapp {
    addRoleToChannel: (
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        signer: ethers.Signer,
    ) => Promise<ContractTransaction>
    createSpace: (params: CreateSpaceParams, signer: ethers.Signer) => Promise<ContractTransaction>
    createChannel: (
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: ethers.Signer,
    ) => Promise<ContractTransaction>
    createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction>
    deleteRole(spaceId: string, roleId: number, signer: ethers.Signer): Promise<ContractTransaction>
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
    updateChannel: (
        params: UpdateChannelParams,
        signer: ethers.Signer,
    ) => Promise<ContractTransaction>
    updateRole: (params: UpdateRoleParams, signer: ethers.Signer) => Promise<ContractTransaction>
    updateSpaceName: (
        spaceId: string,
        name: string,
        signer: ethers.Signer,
    ) => Promise<ContractTransaction>
    setSpaceAccess: (
        spaceId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ) => Promise<ContractTransaction>
    setChannelAccess: (
        spaceId: string,
        channelId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ) => Promise<ContractTransaction>
}
