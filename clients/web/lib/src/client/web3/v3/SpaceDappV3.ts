import { ChannelDetails, ChannelMetadata, Permission, RoleDetails } from '../ContractTypes'
import { ContractTransaction, ethers } from 'ethers'
import { CreateSpaceParams, ISpaceDapp, UpdateChannelParams, UpdateRoleParams } from '../ISpaceDapp'
import { IStaticContractsInfoV3, getContractsInfoV3 } from './IStaticContractsInfoV3'
import { ITownArchitectBase, ITownArchitectShim } from './ITownArchitectShim'
import { SpaceDataTypes, SpaceShim } from '../shims/SpaceShim'
import {
    fromChannelIdToChannelInfo,
    fromPermisisonsToRoleInfo,
    fromSpaceEntitlementsToMemberEntitlement,
} from './ConvertersTownArchitect'

import { SpaceFactoryDataTypes } from '../shims/SpaceFactoryShim'
import { SpaceInfo } from '../SpaceInfo'

/* eslint-disable @typescript-eslint/no-unused-vars */
export class SpaceDappV3 implements ISpaceDapp {
    private readonly chainId: number
    private readonly provider: ethers.providers.Provider | undefined
    private readonly contractsInfo: IStaticContractsInfoV3
    private readonly townArchitect: ITownArchitectShim

    constructor(chainId: number, provider: ethers.providers.Provider | undefined) {
        this.chainId = chainId
        this.provider = provider
        this.contractsInfo = getContractsInfoV3(chainId)
        this.townArchitect = new ITownArchitectShim(
            this.contractsInfo.address,
            this.contractsInfo.townArchitect.abi,
            chainId,
            provider,
        )
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
        return this.townArchitect.write(signer).createTown(townInfo)
    }

    public createChannel(
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }

    public createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
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

    public getSpace(spaceId: string): Promise<SpaceShim | undefined> {
        throw new Error('Method not implemented.')
    }

    public getSpaceInfo(spaceId: string): Promise<SpaceInfo | undefined> {
        throw new Error('Method not implemented.')
    }

    public isEntitledToSpace(
        spaceId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        throw new Error('Method not implemented.')
    }

    public isEntitledToChannel(
        spaceId: string,
        channelId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        throw new Error('Method not implemented.')
    }

    public parseSpaceFactoryError(error: unknown): Error {
        if (!this.townArchitect) {
            throw new Error('TownArchitect is not deployed properly.')
        }
        return this.townArchitect.parseError(error)
    }

    public parseSpaceError(spaceId: string, error: unknown): Promise<Error> {
        throw new Error('Method not implemented.')
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

    public setSpaceAccess(
        spaceId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }

    public setChannelAccess(
        spaceId: string,
        channelId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }
}
