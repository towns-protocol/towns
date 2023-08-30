import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    EntitlementModuleType,
    Permission,
    RoleDetails,
} from '../ContractTypes'
import { BytesLike, ContractTransaction, ethers } from 'ethers'
import { CreateSpaceParams, ISpaceDapp, UpdateChannelParams, UpdateRoleParams } from '../ISpaceDapp'
import { createTokenEntitlementStruct, createUserEntitlementStruct } from './ConvertersEntitlements'

import { IRolesBase } from './IRolesShim'
import { ITownArchitectBase } from './ITownArchitectShim'
import { SpaceInfo } from '../SpaceInfo'
import { Town } from './Town'
import { TownRegistrar } from './TownRegistrar'
import { createEntitlementStruct } from './ConvertersRoles'
import { getContractsInfoV3 } from './IStaticContractsInfoV3'
import { TokenEntitlementDataTypes } from './TokenEntitlementShim'

/* eslint-disable @typescript-eslint/no-unused-vars */
export class SpaceDappV3 implements ISpaceDapp {
    private readonly chainId: number
    private readonly provider: ethers.providers.Provider | undefined
    private readonly townRegistrar: TownRegistrar

    constructor(chainId: number, provider: ethers.providers.Provider | undefined) {
        this.chainId = chainId
        this.provider = provider
        const contractsInfo = getContractsInfoV3(chainId)
        this.townRegistrar = new TownRegistrar(contractsInfo, chainId, provider)
    }

    public async addRoleToChannel(
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Channels.write(signer).addRoleToChannel(channelNetworkId, roleId)
    }

    public async createSpace(
        params: CreateSpaceParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const townInfo: ITownArchitectBase.TownInfoStruct = {
            id: params.spaceId,
            name: params.spaceName,
            uri: params.spaceMetadata,
            everyoneEntitlement: {
                name: 'Everyone',
                permissions: params.everyonePermissions,
            },
            memberEntitlement: params.memberEntitlements,
            channel: {
                id: params.channelId,
                metadata: params.channelName || '',
            },
        }
        return this.townRegistrar.TownArchitect.write(signer).createTown(townInfo)
    }

    public async createChannel(
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Channels.write(signer).createChannel(channelNetworkId, channelName, roleIds)
    }

    public async createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const entitlements = await createEntitlementStruct(town, tokens, users)
        return town.Roles.write(signer).createRole(roleName, permissions, entitlements)
    }

    public async deleteRole(
        spaceId: string,
        roleId: number,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Roles.write(signer).removeRole(roleId)
    }

    public async getChannels(spaceId: string): Promise<ChannelMetadata[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.getChannels()
    }

    public async getChannelDetails(
        spaceId: string,
        channelId: string,
    ): Promise<ChannelDetails | null> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.getChannel(channelId)
    }

    public async getPermissionsByRoleId(spaceId: string, roleId: number): Promise<Permission[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.getPermissionsByRoleId(roleId)
    }

    public async getRole(spaceId: string, roleId: number): Promise<RoleDetails | null> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.getRole(roleId)
    }

    public async getRoles(spaceId: string): Promise<BasicRoleInfo[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const roles: IRolesBase.RoleStructOutput[] = await town.Roles.read.getRoles()
        return roles.map((role) => ({
            roleId: role.id.toNumber(),
            name: role.name,
        }))
    }

    public async getRolesByChannel(
        spaceId: string,
        channelNetworkId: string,
    ): Promise<IRolesBase.RoleStruct[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const roleStructs = await town.getChannelRoles(channelNetworkId)
        return roleStructs.map((roleStruct) => ({
            roleId: roleStruct.id, // TODO: remove this property, it's was part of v2 but not v3
            name: roleStruct.name,
            id: roleStruct.id,
            permissions: roleStruct.permissions,
            entitlements: roleStruct.entitlements,
            disabled: roleStruct.disabled,
        }))
    }

    public async getSpaceInfo(spaceId: string): Promise<SpaceInfo | undefined> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return undefined
        }
        const [owner, disabled, townInfo] = await Promise.all([
            town.Ownable.read.owner(),
            town.Pausable.read.paused(),
            town.getTownInfo(),
        ])
        return {
            address: town.Address,
            networkId: town.SpaceId,
            name: (townInfo.name as string) ?? '',
            owner,
            disabled,
        }
    }

    public async isEntitledToSpace(
        spaceId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return false
        }
        return town.Entitlements.read.isEntitledToTown(user, permission)
    }

    public async isEntitledToChannel(
        spaceId: string,
        channelId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return false
        }
        return town.Entitlements.read.isEntitledToChannel(channelId, user, permission)
    }

    public parseSpaceFactoryError(error: unknown): Error {
        if (!this.townRegistrar.TownArchitect) {
            throw new Error('TownArchitect is not deployed properly.')
        }
        const decodedErr = this.townRegistrar.TownArchitect.parseError(error)
        console.error(decodedErr)
        return decodedErr
    }

    public async parseSpaceError(spaceId: string, error: unknown): Promise<Error> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const decodedErr = town.parseError(error)
        console.error(decodedErr)
        return decodedErr
    }

    public async updateChannel(
        params: UpdateChannelParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(params.spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${params.spaceId}" is not found.`)
        }
        // data for the multicall
        const encodedCallData: BytesLike[] = []
        // update the channel metadata
        encodedCallData.push(
            town.Channels.interface.encodeFunctionData('updateChannel', [
                params.channelId,
                params.channelName,
                params.disabled ?? false, // default to false
            ]),
        )
        // update any channel role changes
        const encodedUpdateChannelRoles = await this.encodeUpdateChannelRoles(
            town,
            params.channelId,
            params.roleIds,
        )
        for (const callData of encodedUpdateChannelRoles) {
            encodedCallData.push(callData)
        }
        return town.Multicall.write(signer).multicall(encodedCallData)
    }

    public async updateRole(
        params: UpdateRoleParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(params.spaceNetworkId)
        if (!town) {
            throw new Error(`Town with spaceId "${params.spaceNetworkId}" is not found.`)
        }
        const updatedEntitlemets = await this.createUpdatedEntitlements(town, params)
        return town.Roles.write(signer).updateRole(
            params.roleId,
            params.roleName,
            params.permissions,
            updatedEntitlemets,
        )
    }

    public async setSpaceAccess(
        spaceId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        if (disabled) {
            return town.Pausable.write(signer).pause()
        } else {
            return town.Pausable.write(signer).unpause()
        }
    }

    public async setChannelAccess(
        spaceId: string,
        channelId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Channels.write(signer).updateChannel(channelId, '', disabled)
    }

    private async getTown(townId: string): Promise<Town | undefined> {
        return this.townRegistrar.getTown(townId)
    }

    private async encodeUpdateChannelRoles(
        town: Town,
        channelId: string,
        _updatedRoleIds: number[],
    ): Promise<BytesLike[]> {
        const encodedCallData: BytesLike[] = []
        const [channelInfo] = await Promise.all([
            town.Channels.read.getChannel(channelId),
            town.getEntitlementShims(),
        ])
        const currentRoleIds = new Set<number>(channelInfo.roleIds.map((r) => r.toNumber()))
        const updatedRoleIds = new Set<number>(_updatedRoleIds)
        const rolesToRemove: number[] = []
        const rolesToAdd: number[] = []
        for (const r of updatedRoleIds) {
            // if the current role IDs does not have the updated role ID, then that role should be added.
            if (!currentRoleIds.has(r)) {
                rolesToAdd.push(r)
            }
        }
        for (const r of currentRoleIds) {
            // if the updated role IDs no longer have the current role ID, then that role should be removed.
            if (!updatedRoleIds.has(r)) {
                rolesToRemove.push(r)
            }
        }
        // encode the call data for each role to remove
        const encodedRemoveRoles = this.encodeRemoveRolesFromChannel(town, channelId, rolesToRemove)
        for (const callData of encodedRemoveRoles) {
            encodedCallData.push(callData)
        }
        // encode the call data for each role to add
        const encodedAddRoles = this.encodeAddRolesToChannel(town, channelId, rolesToAdd)
        for (const callData of encodedAddRoles) {
            encodedCallData.push(callData)
        }
        return encodedCallData
    }

    private encodeAddRolesToChannel(town: Town, channelId: string, roleIds: number[]): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const roleId of roleIds) {
            const encodedBytes = town.Channels.interface.encodeFunctionData('addRoleToChannel', [
                channelId,
                roleId,
            ])
            encodedCallData.push(encodedBytes)
        }
        return encodedCallData
    }

    private encodeRemoveRolesFromChannel(
        town: Town,
        channelId: string,
        roleIds: number[],
    ): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const roleId of roleIds) {
            const encodedBytes = town.Channels.interface.encodeFunctionData(
                'removeRoleFromChannel',
                [channelId, roleId],
            )
            encodedCallData.push(encodedBytes)
        }
        return encodedCallData
    }

    private async createUpdatedEntitlements(
        town: Town,
        params: UpdateRoleParams,
    ): Promise<IRolesBase.CreateEntitlementStruct[]> {
        const updatedEntitlements: IRolesBase.CreateEntitlementStruct[] = []
        const [tokenEntitlement, userEntitlement] = await Promise.all([
            town.findEntitlementByType(EntitlementModuleType.TokenEntitlement),
            town.findEntitlementByType(EntitlementModuleType.UserEntitlement),
        ])
        if (params.tokens.length > 0 && tokenEntitlement?.address) {
            const entitlementData = createTokenEntitlementStruct(
                tokenEntitlement.address,
                params.tokens,
            )
            updatedEntitlements.push(entitlementData)
        }
        if (params.users.length > 0 && userEntitlement?.address) {
            const entitlementData = createUserEntitlementStruct(
                userEntitlement.address,
                params.users,
            )
            updatedEntitlements.push(entitlementData)
        }
        return updatedEntitlements
    }
}
