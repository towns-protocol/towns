/* eslint-disable no-restricted-imports */

import { ContractTransaction, ethers } from 'ethers'
import { Permission } from './ContractTypes'
import { SpaceDataTypes } from './shims/SpaceShim'
import { SpaceFactoryDataTypes } from './shims/SpaceFactoryShim'
import { SpaceInfo } from './SpaceInfo'

export interface EventsContractInfo {
    abi: ethers.ContractInterface
    address: string
}

export interface ISpaceDapp {
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
    createRoleWithEntitlementData(
        spaceId: string,
        roleName: string,
        permissions: string[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
    ): Promise<ContractTransaction>
    getPermissionsByRoleId: (spaceId: string, roleId: number) => Promise<Permission[]>
    getRoles: (spaceId: string) => Promise<SpaceDataTypes.RoleStructOutput[]>
    getSpaceFactoryEventsContractInfo: () => EventsContractInfo
    getSpaceEventsContractInfo: (spaceId: string) => Promise<EventsContractInfo>
    getSpaceInfo: (spaceId: string) => Promise<SpaceInfo>
    isEntitledToSpace: (spaceId: string, user: string, permission: Permission) => Promise<boolean>
    isEntitledToChannel: (
        spaceId: string,
        channelId: string,
        user: string,
        permission: Permission,
    ) => Promise<boolean>
    parseSpaceFactoryError: (error: unknown) => Error
    parseSpaceError: (spaceId: string, error: unknown) => Promise<Error>
    setSpaceAccess: (spaceId: string, disabled: boolean) => Promise<ContractTransaction>
    setChannelAccess: (
        spaceId: string,
        channelId: string,
        disabled: boolean,
    ) => Promise<ContractTransaction>
}
