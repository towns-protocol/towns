import { ChannelDetails, ChannelMetadata, Permission, RoleDetails } from '../ContractTypes'
import { ContractTransaction, ethers } from 'ethers'
import { CreateSpaceParams, ISpaceDapp, UpdateChannelParams, UpdateRoleParams } from '../ISpaceDapp'
import {
    fromChannelIdToChannelInfo,
    fromPermisisonsToRoleInfo,
    fromSpaceEntitlementsToMemberEntitlement,
} from './ConvertersTownArchitect'

import { ITownArchitectBase } from './ITownArchitectShim'
import { SpaceDataTypes } from '../shims/SpaceShim'
import { SpaceFactoryDataTypes } from '../shims/SpaceFactoryShim'
import { SpaceInfo } from '../SpaceInfo'
import { Town } from './Town'
import { TownRegistrar } from './TownRegistrar'
import { fromCreateRoleStructToCreateEntitlementStruct } from './ConvertersRoles'
import { getContractsInfoV3 } from './IStaticContractsInfoV3'

/* eslint-disable @typescript-eslint/no-unused-vars */
export class SpaceDappV3 implements ISpaceDapp {
    private readonly chainId: number
    private readonly provider: ethers.providers.Provider | undefined
    private readonly townRegistrar: TownRegistrar

    constructor(chainId: number, provider: ethers.providers.Provider | undefined) {
        this.chainId = chainId
        this.provider = provider
        const contractsInfo = getContractsInfoV3(chainId)
        this.townRegistrar = new TownRegistrar(contractsInfo.address, chainId, provider)
    }

    public addRoleToChannel(
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }

    public async createSpace(
        params: CreateSpaceParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const townInfo: ITownArchitectBase.TownInfoStruct = {
            id: params.spaceId,
            metadata: params.spaceMetadata,
            everyoneEntitlement: fromPermisisonsToRoleInfo('Everyone', params.everyonePermissions),
            memberEntitlement: fromSpaceEntitlementsToMemberEntitlement(params.memberEntitlements),
            channel: fromChannelIdToChannelInfo(params.channelId),
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
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const entitlements = await fromCreateRoleStructToCreateEntitlementStruct(
            town,
            tokens,
            users,
        )
        return town.Roles.write(signer).createRole(roleName, permissions, entitlements)
    }

    public deleteRole(
        spaceId: string,
        roleId: number,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }

    public getChannels(spaceId: string): Promise<ChannelMetadata[]> {
        throw new Error('Method not implemented.')
    }

    public getChannelDetails(spaceId: string, channelId: string): Promise<ChannelDetails | null> {
        throw new Error('Method not implemented.')
    }

    public getPermissionsByRoleId(spaceId: string, roleId: number): Promise<Permission[]> {
        throw new Error('Method not implemented.')
    }

    public getRole(spaceId: string, roleId: number): Promise<RoleDetails | null> {
        throw new Error('Method not implemented.')
    }

    public getRoles(spaceId: string): Promise<SpaceDataTypes.RoleStructOutput[]> {
        throw new Error('Method not implemented.')
    }

    public getRolesByChannel(
        spaceId: string,
        channelNetworkId: string,
    ): Promise<SpaceDataTypes.RoleStructOutput[]> {
        throw new Error('Method not implemented.')
    }

    public getSpaceInfo(spaceId: string): Promise<SpaceInfo | undefined> {
        throw new Error('Method not implemented.')
    }

    public async isEntitledToSpace(
        spaceId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
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
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Entitlements.read.isEntitledToChannel(channelId, user, permission)
    }

    public parseSpaceFactoryError(error: unknown): Error {
        if (!this.townRegistrar.TownArchitect) {
            throw new Error('TownArchitect is not deployed properly.')
        }
        return this.townRegistrar.TownArchitect.parseError(error)
    }

    public async parseSpaceError(spaceId: string, error: unknown): Promise<Error> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.parseError(error)
    }

    public updateChannel(
        params: UpdateChannelParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }

    public updateRole(
        params: UpdateRoleParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
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

    public setChannelAccess(
        spaceId: string,
        channelId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }

    private async getTown(townId: string): Promise<Town | undefined> {
        return this.townRegistrar.getTown(townId)
    }
}
