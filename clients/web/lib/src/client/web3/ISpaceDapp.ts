/* eslint-disable no-restricted-imports */

import { BigNumber, ContractTransaction } from 'ethers'
import { Permission } from './ZionContractTypes'
import { DataTypes as SpaceDataTypes } from '@harmony/contracts/localhost/typings/Space'
import { DataTypes as SpaceFactoryDataTypes } from '@harmony/contracts/localhost/typings/SpaceFactory'
import { SpaceInfo } from './SpaceInfo'

export interface ISpaceDapp {
    createSpace: (
        spaceName: string,
        spaceNetworkId: string,
        spaceMetadata: string,
        permissions: Permission[],
        extraEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
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
    getSpaceIdByNetworkId: (spaceId: string) => Promise<BigNumber> // todo: v1. deprecated.
    getSpaceInfo: (spaceId: string) => Promise<SpaceInfo>
    isEntitledToSpace: (spaceId: string, user: string, permission: string) => Promise<boolean>
    isEntitledToChannel: (
        spaceId: string,
        channelId: string,
        user: string,
        permission: string,
    ) => Promise<boolean>
    parseSpaceFactoryError: (error: unknown) => Error
    parseSpaceError: (spaceId: string, error: unknown) => Promise<Error>
    setAccess: (spaceId: string, disabled: boolean) => Promise<ContractTransaction>
    setChannelAccess: (
        spaceId: string,
        channelId: string,
        disabled: boolean,
    ) => Promise<ContractTransaction>
}
