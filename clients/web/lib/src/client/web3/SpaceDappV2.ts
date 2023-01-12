/* eslint-disable no-restricted-imports */

import { ContractTransaction, ethers } from 'ethers'
import { EventsContractInfo, ISpaceDapp } from './ISpaceDapp'
import { IContractsInfo, getContractsInfo } from './ContractsInfo'
import { SpaceDataTypes, SpaceShim } from './shims/SpaceShim'
import { SpaceFactoryDataTypes, SpaceFactoryShim } from './shims/SpaceFactoryShim'

import { Permission } from './ContractTypes'
import { SpaceInfo } from './SpaceInfo'
import { keccak256 } from 'ethers/lib/utils'
import { toUtf8Bytes } from '@ethersproject/strings'

interface Spaces {
    [spaceId: string]: SpaceShim
}

export class SpaceDappV2 implements ISpaceDapp {
    private readonly chainId: number
    private readonly spaceFactory: SpaceFactoryShim
    private readonly spaces: Spaces = {}
    private readonly contractsInfo: IContractsInfo
    private readonly provider: ethers.providers.Provider | undefined
    private readonly signer: ethers.Signer | undefined

    constructor(
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
    ) {
        this.chainId = chainId
        this.provider = provider
        this.signer = signer
        this.contractsInfo = getContractsInfo(chainId)
        this.spaceFactory = new SpaceFactoryShim(
            this.contractsInfo.spaceFactory.address.spaceFactory,
            this.contractsInfo.spaceFactory.abi,
            chainId,
            provider,
            signer,
        )
    }

    public async createSpace(
        spaceName: string,
        spaceNetworkId: string,
        spaceMetadata: string,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
    ): Promise<ContractTransaction> {
        if (!this.spaceFactory.write) {
            throw new Error('SpaceFactory write contract is not deployed properly.')
        }
        return this.spaceFactory.write.createSpace(
            spaceName,
            spaceNetworkId,
            spaceMetadata,
            everyonePermissions,
            memberEntitlements,
        )
    }

    public async createChannel(
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space.write) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.write.createChannel(channelName, channelNetworkId, roleIds)
    }

    public createRoleWithEntitlementData(
        _spaceId: string,
        _roleName: string,
        _permissions: string[],
        _tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        _users: string[],
    ): Promise<ContractTransaction> {
        // V2 smart contract does not support this yet
        throw new Error('Method not implemented.')
    }

    public async getRoles(spaceId: string): Promise<SpaceDataTypes.RoleStructOutput[]> {
        const space = await this.getSpace(spaceId)
        if (!space.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.read.getRoles()
    }

    public async getPermissionsByRoleId(spaceId: string, roleId: number): Promise<Permission[]> {
        const space = await this.getSpace(spaceId)
        if (!space.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        const permissions = space.read.getPermissionsByRoleId(roleId)
        return (await permissions).map((permission) => permission as Permission)
    }

    public getSpaceFactoryEventsContractInfo(): EventsContractInfo {
        return {
            abi: this.spaceFactory.eventsAbi,
            address: this.spaceFactory.address,
        }
    }

    public async getSpaceEventsContractInfo(spaceId: string): Promise<EventsContractInfo> {
        const space = await this.getSpace(spaceId)
        if (!space.eventsAbi) {
            throw new Error(`events abi for space "${spaceId}" is not found.`)
        }
        return {
            abi: space.eventsAbi,
            address: space.address,
        }
    }

    public async getSpaceInfo(spaceId: string): Promise<SpaceInfo> {
        const space = await this.getSpace(spaceId)
        if (!space.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        const [name, owner, disabled] = await Promise.all([
            space.read.name(),
            space.read.owner(),
            space.read.disabled(),
        ])
        return {
            networkId: spaceId,
            name,
            owner,
            disabled,
        }
    }

    public async isEntitledToSpace(
        spaceId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const space = await this.getSpace(spaceId)
        if (!space.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.read.isEntitledToSpace(user, permission)
    }

    public async isEntitledToChannel(
        spaceId: string,
        channelId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const space = await this.getSpace(spaceId)
        if (!space.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.read.isEntitledToChannel(channelId, user, permission)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public parseSpaceFactoryError(error: any): Error {
        if (!this.spaceFactory.write) {
            throw new Error('SpaceFactory write contract is not deployed properly.')
        }
        return this.spaceFactory.parseError(error)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async parseSpaceError(spaceId: string, error: any): Promise<Error> {
        const space = await this.getSpace(spaceId)
        if (!space.write) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.parseError(error)
    }

    public async setSpaceAccess(spaceId: string, disabled: boolean): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space.write) {
            throw new Error(`Space with networkId "${spaceId}" is not deployed properly.`)
        }
        return space.write.setSpaceAccess(disabled)
    }

    public async setChannelAccess(
        spaceId: string,
        channelId: string,
        disabled: boolean,
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space.write) {
            throw new Error(`Space with networkId "${spaceId}" is not deployed properly.`)
        }
        return space.write.setChannelAccess(channelId, disabled)
    }

    private async getSpace(spaceId: string): Promise<SpaceShim> {
        if (!this.provider || !this.signer) {
            throw new Error('Provider or signer is not set.')
        }
        if (!this.spaces[spaceId]) {
            const hash = keccak256(toUtf8Bytes(spaceId))
            const spaceAddress = await this.spaceFactory.read?.spaceByHash(hash)
            if (!spaceAddress) {
                throw new Error(`Space ${spaceId} not found`)
            }
            // todo: fetch the correct abi by version. For now, use the latest abi.
            const abi = this.contractsInfo.spaceFactory.abi
            this.spaces[spaceId] = new SpaceShim(
                spaceAddress,
                abi,
                this.chainId,
                this.provider,
                this.signer,
            )
        }
        return this.spaces[spaceId]
    }
}
