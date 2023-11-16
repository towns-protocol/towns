import { CreateSpaceParams, ISpaceDapp, UpdateChannelParams, UpdateRoleParams } from './ISpaceDapp'
import { PublicClient, WalletClient, Address, Hex } from 'viem'
import { Town } from './Town'
import { TownRegistrar } from './TownRegistrar'
import { createEntitlementStruct } from '../ConvertersRoles'
import { getContractsInfo } from '../IStaticContractsInfo'
import {
    IRolesBase,
    ITownArchitectBase,
    SpaceDappTransaction,
    TokenEntitlementDataTypes,
} from './types'
import {
    Permission,
    ChannelMetadata,
    ChannelDetails,
    RoleDetails,
    BasicRoleInfo,
    EntitlementModuleType,
    EntitlementStruct,
} from '../ContractTypes'
import { SpaceInfo } from '../SpaceInfo'
import {
    createTokenEntitlementStruct,
    createUserEntitlementStruct,
} from '../ConvertersEntitlements'

export class SpaceDapp implements ISpaceDapp {
    private readonly townRegistrar: TownRegistrar

    constructor(chainId: number, client: PublicClient | undefined) {
        const contractsInfo = getContractsInfo(chainId)
        this.townRegistrar = new TownRegistrar(contractsInfo, chainId, client)
    }

    public async addRoleToChannel(
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Channels.write({
            functionName: 'addRoleToChannel',
            args: [channelNetworkId, BigInt(roleId)],
            wallet,
        })
    }

    public async createSpace(
        params: CreateSpaceParams,
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const townInfo: ITownArchitectBase['TownStruct'] = {
            id: params.spaceId,
            name: params.spaceName,
            uri: params.spaceMetadata,
            membership: params.membership,
            channel: {
                id: params.channelId,
                metadata: params.channelName || '',
            },
        }
        return this.townRegistrar.TownArchitect.write({
            functionName: 'createTown',
            args: [townInfo],
            wallet,
        })
    }

    public async createChannel(
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const roleIdsBigInt = roleIds.map((r) => BigInt(r))
        return town.Channels.write({
            functionName: 'createChannel',
            args: [channelNetworkId, channelName, roleIdsBigInt],
            wallet,
        })
    }

    public async createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes['ExternalTokenStruct'][],
        users: Address[],
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const entitlements = (await createEntitlementStruct(
            town,
            tokens,
            users,
            'v4',
        )) as EntitlementStruct<'v4'>[]

        return town.Roles.write({
            functionName: 'createRole',
            args: [roleName, permissions, entitlements],
            wallet,
        })
    }

    public async deleteRole(
        spaceId: string,
        roleId: number,
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Roles.write({
            functionName: 'removeRole',
            args: [BigInt(roleId)],
            wallet,
        })
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
    ): Promise<ChannelDetails<'v4'> | null> {
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

    public async getRole(spaceId: string, roleId: number): Promise<RoleDetails<'v4'> | null> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.getRole(BigInt(roleId))
    }

    public async getRoles(spaceId: string): Promise<BasicRoleInfo[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const roles: readonly IRolesBase['RoleStructOutput'][] = await town.Roles.read({
            functionName: 'getRoles',
        })
        return roles.map((role) => ({
            roleId: Number(role.id),
            name: role.name,
        }))
    }

    public async getSpaceInfo(spaceId: string): Promise<SpaceInfo | undefined> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return undefined
        }
        const [owner, disabled, townInfo] = await Promise.all([
            town.Ownable.read({
                functionName: 'owner',
            }),
            town.Pausable.read({
                functionName: 'paused',
            }),
            town.getTownInfo(),
        ])
        return {
            address: town.Address,
            networkId: town.SpaceId,
            name: townInfo.name ?? '',
            owner,
            disabled,
        }
    }

    public async isEntitledToSpace(
        spaceId: string,
        user: Address,
        permission: Permission,
    ): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return false
        }
        return town.Entitlements.read({
            functionName: 'isEntitledToTown',
            args: [user, permission],
        })
    }

    public async isEntitledToChannel(
        spaceId: string,
        channelId: string,
        user: Address,
        permission: Permission,
    ): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return false
        }
        return town.Entitlements.read({
            functionName: 'isEntitledToChannel',
            args: [channelId, user, permission],
        })
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
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const town = await this.getTown(params.spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${params.spaceId}" is not found.`)
        }
        // data for the multicall
        const encodedCallData: Hex[] = []
        // update the channel metadata
        encodedCallData.push(
            town.Channels.encodeFunctionData({
                functionName: 'updateChannel',
                args: [params.channelId, params.channelName, params.disabled ?? false],
            }),
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
        return town.Multicall.write({
            functionName: 'multicall',
            args: [encodedCallData],
            wallet,
        })
    }

    public async updateRole(
        params: UpdateRoleParams,
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const town = await this.getTown(params.spaceNetworkId)
        if (!town) {
            throw new Error(`Town with spaceId "${params.spaceNetworkId}" is not found.`)
        }
        const updatedEntitlemets = await this.createUpdatedEntitlements(town, params)
        return town.Roles.write({
            functionName: 'updateRole',
            args: [BigInt(params.roleId), params.roleName, params.permissions, updatedEntitlemets],
            wallet,
        })
    }

    public async setSpaceAccess(
        spaceId: string,
        disabled: boolean,
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        if (disabled) {
            return town.Pausable.write({
                functionName: 'pause',
                wallet,
            })
        } else {
            return town.Pausable.write({
                functionName: 'unpause',
                wallet,
            })
        }
    }

    public async setChannelAccess(
        spaceId: string,
        channelId: string,
        disabled: boolean,
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Channels.write({
            functionName: 'updateChannel',
            args: [channelId, '', disabled],
            wallet,
        })
    }

    private async getTown(townId: string): Promise<Town | undefined> {
        return this.townRegistrar.getTown(townId)
    }

    private async encodeUpdateChannelRoles(
        town: Town,
        channelId: string,
        _updatedRoleIds: number[],
    ): Promise<Hex[]> {
        const encodedCallData: Hex[] = []
        const [channelInfo] = await Promise.all([
            town.Channels.read({
                functionName: 'getChannel',
                args: [channelId],
            }),
            town.getEntitlementShims(),
        ])
        const currentRoleIds = new Set<number>(channelInfo.roleIds.map((r) => Number(r)))
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

    private encodeAddRolesToChannel(town: Town, channelId: string, roleIds: number[]): Hex[] {
        const encodedCallData: Hex[] = []
        for (const roleId of roleIds) {
            const encodedBytes = town.Channels.encodeFunctionData({
                functionName: 'addRoleToChannel',
                args: [channelId, BigInt(roleId)],
            })
            encodedCallData.push(encodedBytes)
        }
        return encodedCallData
    }

    private encodeRemoveRolesFromChannel(town: Town, channelId: string, roleIds: number[]): Hex[] {
        const encodedCallData: Hex[] = []
        for (const roleId of roleIds) {
            const encodedBytes = town.Channels.encodeFunctionData({
                functionName: 'removeRoleFromChannel',
                args: [channelId, BigInt(roleId)],
            })
            encodedCallData.push(encodedBytes)
        }
        return encodedCallData
    }

    private async createUpdatedEntitlements(
        town: Town,
        params: UpdateRoleParams,
    ): Promise<IRolesBase['CreateEntitlementStruct'][]> {
        const updatedEntitlements: IRolesBase['CreateEntitlementStruct'][] = []
        const [tokenEntitlement, userEntitlement] = await Promise.all([
            town.findEntitlementByType(EntitlementModuleType.TokenEntitlement),
            town.findEntitlementByType(EntitlementModuleType.UserEntitlement),
        ])
        if (params.tokens.length > 0 && tokenEntitlement?.address) {
            const entitlementData = createTokenEntitlementStruct(
                tokenEntitlement.address,
                params.tokens,
                'v4',
            ) as IRolesBase['CreateEntitlementStruct']

            updatedEntitlements.push(entitlementData)
        }
        if (params.users.length > 0 && userEntitlement?.address) {
            const entitlementData = createUserEntitlementStruct(
                userEntitlement.address,
                params.users,
                'v4',
            ) as IRolesBase['CreateEntitlementStruct']

            updatedEntitlements.push(entitlementData)
        }
        return updatedEntitlements
    }
}
