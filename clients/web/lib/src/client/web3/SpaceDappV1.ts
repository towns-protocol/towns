/* eslint-disable no-restricted-imports */

import { BytesLike, ContractTransaction, ethers } from 'ethers'
import { EventsContractInfo, ISpaceDapp } from './ISpaceDapp'
import {
    DataTypes as SpaceManagerDataTypes,
    ZionSpaceManagerShim,
} from './shims/ZionSpaceManagerShim'
import { createExternalTokenEntitlements, createPermissions } from './ContractHelpers'

import { Permission } from './ContractTypes'
import { DataTypes as SpaceDataTypes } from '@harmony/contracts/localhost/typings/Space'
import { SpaceFactoryDataTypes } from './shims/SpaceFactoryShim'
import { SpaceInfo } from './SpaceInfo'
import { ZionRoleManagerShim } from './shims/ZionRoleManagerShim'

// todo: this exists mainly to unblock the migration to v2.
// todo: remove when migration to v2 is completed
export class SpaceDappV1 implements ISpaceDapp {
    private readonly spaceManager: ZionSpaceManagerShim
    private readonly roleManager: ZionRoleManagerShim

    constructor(
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
    ) {
        this.spaceManager = new ZionSpaceManagerShim(provider, signer, chainId)
        this.roleManager = new ZionRoleManagerShim(provider, signer, chainId)
    }

    public createSpace(
        spaceName: string,
        spaceNetworkId: string,
        spaceMetadata: string,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
    ): Promise<ContractTransaction> {
        const spaceInfo: SpaceManagerDataTypes.CreateSpaceDataStruct = {
            spaceName,
            spaceNetworkId,
            spaceMetadata,
        }
        const everyonePerms = createPermissions(everyonePermissions)
        const memberEntitlementData = this.createMemberEntitlementData(memberEntitlements)
        return this.spaceManager.createSpace(spaceInfo, memberEntitlementData, everyonePerms)
    }

    public createChannel(
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
    ): Promise<ContractTransaction> {
        const channelInfo: SpaceManagerDataTypes.CreateChannelDataStruct = {
            spaceNetworkId: spaceId,
            channelName,
            channelNetworkId,
            roleIds,
        }
        return this.spaceManager.createChannel(channelInfo)
    }

    public createRole(
        spaceId: string,
        roleName: string,
        _permissions: Permission[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
    ): Promise<ContractTransaction> {
        const permissions = createPermissions(_permissions)
        const tokenAddresses = tokens.map((token) => token.contractAddress as string)
        const tokenEntitlement = createExternalTokenEntitlements(tokenAddresses)
        return this.spaceManager.createRoleWithEntitlementData(
            spaceId,
            roleName,
            permissions,
            tokenEntitlement,
            users,
        )
    }

    public async getPermissionsByRoleId(
        spaceNetworkId: string,
        roleId: number,
    ): Promise<Permission[]> {
        const spaceId = await this.spaceManager.unsigned.getSpaceIdByNetworkId(spaceNetworkId)
        const permissions = this.roleManager.unsigned.getPermissionsBySpaceIdByRoleId(
            spaceId.toNumber(),
            roleId,
        )
        return (await permissions).map((permission) => permission.name as Permission)
    }

    public async getRoles(spaceNetworkId: string): Promise<SpaceDataTypes.RoleStructOutput[]> {
        const spaceId = await this.spaceManager.unsigned.getSpaceIdByNetworkId(spaceNetworkId)
        // get all the roles in the space
        const allSpaceRoles = await this.roleManager.unsigned.getRolesBySpaceId(spaceId)
        return allSpaceRoles.map(
            (role) =>
                ({
                    roleId: role.roleId,
                    name: role.name,
                } as SpaceDataTypes.RoleStructOutput),
        )
    }

    public getSpaceInfo(spaceNetworkId: string): Promise<SpaceInfo | undefined> {
        return this.spaceManager.unsigned.getSpaceInfoBySpaceId(spaceNetworkId)
    }

    public getSpaceFactoryEventsContractInfo(): EventsContractInfo {
        return {
            abi: this.spaceManager.eventsAbi,
            address: this.spaceManager.address,
        }
    }

    public getSpaceEventsContractInfo(_spaceId: string): Promise<EventsContractInfo> {
        // spaceManager v1 doesn't have a separate events abi for spaces
        return Promise.resolve({
            abi: this.spaceManager.eventsAbi,
            address: this.spaceManager.address,
        })
    }

    public isEntitledToSpace(
        spaceId: string,
        user: string,
        _permission: Permission,
    ): Promise<boolean> {
        const permission: SpaceManagerDataTypes.PermissionStruct = {
            name: _permission,
        }
        return this.spaceManager.unsigned.isEntitled(spaceId, '', user, permission)
    }

    public isEntitledToChannel(
        spaceId: string,
        channelId: string,
        user: string,
        _permission: Permission,
    ): Promise<boolean> {
        const permission: SpaceManagerDataTypes.PermissionStruct = {
            name: _permission,
        }
        return this.spaceManager.unsigned.isEntitled(spaceId, channelId, user, permission)
    }

    public parseSpaceFactoryError(error: unknown): Error {
        return this.getDecodedError(error)
    }

    public parseSpaceError(_spaceId: string, error: unknown): Promise<Error> {
        return Promise.resolve(this.getDecodedError(error))
    }

    public setSpaceAccess(spaceNetworkId: string, disabled: boolean): Promise<ContractTransaction> {
        return this.spaceManager.signed.setSpaceAccess(spaceNetworkId, disabled)
    }

    public setChannelAccess(
        spaceNetworkId: string,
        channelNetworkId: string,
        disabled: boolean,
    ): Promise<ContractTransaction> {
        return this.spaceManager.signed.setChannelAccess(spaceNetworkId, channelNetworkId, disabled)
    }

    private createMemberEntitlementData(
        entitlementData: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
    ): SpaceManagerDataTypes.CreateSpaceEntitlementDataStruct {
        const tokenPermissions = createPermissions(entitlementData.permissions as Permission[])
        const tokenAddresses = entitlementData.tokens.map(
            (token) => token.contractAddress as string,
        )
        const externalTokenEntitlements = createExternalTokenEntitlements(tokenAddresses)
        return {
            roleName: entitlementData.roleName,
            permissions: tokenPermissions,
            externalTokenEntitlements: externalTokenEntitlements,
            users: entitlementData.users,
        }
    }

    private getDecodedError(error: unknown): Error {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const anyError = error as any
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const revertData: BytesLike = anyError.error?.error?.error?.data
        if (!revertData) {
            return {
                name: 'unknown',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: anyError?.message,
            }
        }

        let decodedError: Error | undefined = undefined
        try {
            const errDescription = this.spaceManager.signed.interface.parseError(revertData)
            decodedError = {
                name: errDescription.errorFragment.name,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: anyError.error?.error?.error?.message,
            }

            return decodedError

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            // Cannot decode error
            console.error('[getDecodedError]', e)
            return {
                name: 'unknown',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: e.message,
            }
        }
    }
}
