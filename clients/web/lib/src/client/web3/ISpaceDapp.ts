import { ContractTransaction, ethers } from 'ethers'
import { ChannelDetails, Permission, RoleDetails } from './ContractTypes'
import { SpaceDataTypes, SpaceShim } from './shims/SpaceShim'

import { SpaceFactoryDataTypes } from './shims/SpaceFactoryShim'
import { SpaceInfo } from './SpaceInfo'
import { TokenDataTypes } from './shims/TokenEntitlementShim'

export interface EventsContractInfo {
    abi: ethers.ContractInterface
    address: string
}

export interface UpdateChannelParams {
    spaceNetworkId: string
    channelNetworkId: string
    channelName: string
    roleIds: number[]
}

export interface UpdateRoleParams {
    spaceNetworkId: string
    roleId: number
    roleName: string
    permissions: Permission[]
    tokens: TokenDataTypes.ExternalTokenStruct[]
    users: string[]
}

export interface ISpaceDapp {
    addRoleToChannel: (
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
    ) => Promise<ContractTransaction>
    createSpace: (
        spaceName: string,
        spaceNetworkId: string,
        spaceMetadata: string,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
    ) => Promise<ContractTransaction>
    createChannel: (
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
    ) => Promise<ContractTransaction>
    createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
    ): Promise<ContractTransaction>
    deleteRole(spaceId: string, roleId: number): Promise<ContractTransaction>
    getChannelDetails: (spaceId: string, channelId: string) => Promise<ChannelDetails | null>
    getPermissionsByRoleId: (spaceId: string, roleId: number) => Promise<Permission[]>
    getRole: (spaceId: string, roleId: number) => Promise<RoleDetails | null>
    getRoles: (spaceId: string) => Promise<SpaceDataTypes.RoleStructOutput[]>
    getRolesByChannel: (
        spaceId: string,
        channelNetworkId: string,
    ) => Promise<SpaceDataTypes.RoleStructOutput[]>
    getSpace: (spaceId: string, requireSigner?: boolean) => Promise<SpaceShim | undefined>
    getSpaceFactoryEventsContractInfo: () => EventsContractInfo
    getSpaceEventsContractInfo: (spaceId: string) => Promise<EventsContractInfo>
    getSpaceInfo: (spaceId: string, requireSigner?: boolean) => Promise<SpaceInfo | undefined>
    isEntitledToSpace: (spaceId: string, user: string, permission: Permission) => Promise<boolean>
    isEntitledToChannel: (
        spaceId: string,
        channelId: string,
        user: string,
        permission: Permission,
    ) => Promise<boolean>
    parseSpaceFactoryError: (error: unknown) => Error
    parseSpaceError: (spaceId: string, error: unknown) => Promise<Error>
    updateChannel: (params: UpdateChannelParams) => Promise<ContractTransaction>
    updateRole: (params: UpdateRoleParams) => Promise<ContractTransaction>
    setSpaceAccess: (spaceId: string, disabled: boolean) => Promise<ContractTransaction>
    setChannelAccess: (
        spaceId: string,
        channelId: string,
        disabled: boolean,
    ) => Promise<ContractTransaction>
}
