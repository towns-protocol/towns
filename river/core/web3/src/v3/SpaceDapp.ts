import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    EntitlementModuleType,
    Permission,
    PricingModuleStruct,
    RoleDetails,
} from '../ContractTypes'
import { BytesLike, ContractReceipt, ContractTransaction, ethers } from 'ethers'
import { CreateSpaceParams, ISpaceDapp, UpdateChannelParams, UpdateRoleParams } from '../ISpaceDapp'
import { createRuleEntitlementStruct, createUserEntitlementStruct } from '../ConvertersEntitlements'

import { IRolesBase } from './IRolesShim'
import { Town } from './Town'
import { TownRegistrar } from './TownRegistrar'
import { createEntitlementStruct } from '../ConvertersRoles'
import { getContractsInfo } from '../IStaticContractsInfo'
import { WalletLink } from './WalletLink'
import { SpaceDappConfig, SpaceInfo } from '../SpaceDappTypes'
import { IRuleEntitlement } from './index'
import { PricingModules } from './PricingModules'
import { dlogger } from '@river/dlog'

const logger = dlogger('csb:SpaceDapp:debug')

export class SpaceDapp implements ISpaceDapp {
    public readonly chainId: number
    public readonly provider: ethers.providers.Provider | undefined
    public readonly townRegistrar: TownRegistrar
    public readonly pricingModules: PricingModules
    public readonly walletLink: WalletLink

    constructor(config: SpaceDappConfig) {
        const { chainId, provider } = config
        this.chainId = chainId
        this.provider = provider
        const contractsInfo = getContractsInfo(chainId)
        this.townRegistrar = new TownRegistrar(contractsInfo, chainId, provider)
        this.walletLink = new WalletLink(contractsInfo, chainId, provider)
        this.pricingModules = new PricingModules(contractsInfo, chainId, provider)
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

    public async banWalletAddress(spaceId: string, walletAddress: string, signer: ethers.Signer) {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const token = await town.Membership.read.getTokenIdByMembership(walletAddress)
        return town.Banning.write(signer).ban(token)
    }

    public async unbanWalletAddress(
        spaceId: string,
        walletAddress: string,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const token = await town.Membership.read.getTokenIdByMembership(walletAddress)
        return town.Banning.write(signer).unban(token)
    }

    public async walletAddressIsBanned(spaceId: string, walletAddress: string): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const token = await town.Membership.read.getTokenIdByMembership(walletAddress)
        return await town.Banning.read.isBanned(token)
    }

    public async bannedWalletAddresses(spaceId: string): Promise<string[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const bannedTokenIds = await town.Banning.read.banned()
        const bannedWalletAddresses = await Promise.all(
            bannedTokenIds.map(async (tokenId) => await town.Membership.read.ownerOf(tokenId)),
        )
        return bannedWalletAddresses
    }

    public async createSpace(
        params: CreateSpaceParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const spaceInfo = {
            name: params.spaceName,
            uri: params.spaceMetadata,
            membership: params.membership as any,
            channel: {
                metadata: params.channelName || '',
            },
        }
        return this.townRegistrar.TownArchitect.write(signer).createSpace(spaceInfo)
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
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        return town.Channels.write(signer).createChannel(channelId, channelName, roleIds)
    }

    public async createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlement.RuleDataStruct,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const entitlements = await createEntitlementStruct(town, users, ruleData)
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
        channelNetworkId: string,
    ): Promise<ChannelDetails | null> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
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

    public async updateSpaceName(
        spaceId: string,
        name: string,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const townInfo = await town.getTownInfo()
        // update the town name
        return town.TownOwner.write(signer).updateSpaceInfo(town.Address, name, townInfo.uri)
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
        return town.Entitlements.read.isEntitledToSpace(user, permission)
    }

    public async isEntitledToChannel(
        spaceId: string,
        channelNetworkId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return false
        }
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`

        return town.Entitlements.read.isEntitledToChannel(channelId, user, permission)
    }

    public parseSpaceFactoryError(error: unknown): Error {
        if (!this.townRegistrar.TownArchitect) {
            throw new Error('TownArchitect is not deployed properly.')
        }
        const decodedErr = this.townRegistrar.TownArchitect.parseError(error)
        logger.error(decodedErr)
        return decodedErr
    }

    public async parseSpaceError(spaceId: string, error: unknown): Promise<Error> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const decodedErr = town.parseError(error)
        logger.error(decodedErr)
        return decodedErr
    }

    public async parseSpaceLogs(
        spaceId: string,
        logs: ethers.providers.Log[],
    ): Promise<(ethers.utils.LogDescription | undefined)[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return logs.map((spaceLog) => {
            try {
                return town.parseLog(spaceLog)
            } catch (err) {
                logger.error(err)
                return
            }
        })
    }

    public async updateChannel(
        params: UpdateChannelParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(params.spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${params.spaceId}" is not found.`)
        }
        const encodedCallData = await this.encodedUpdateChannelData(town, params)
        return town.Multicall.write(signer).multicall(encodedCallData)
    }

    public async encodedUpdateChannelData(town: Town, params: UpdateChannelParams) {
        // data for the multicall
        const encodedCallData: BytesLike[] = []
        // update the channel metadata
        encodedCallData.push(
            town.Channels.interface.encodeFunctionData('updateChannel', [
                params.channelId.startsWith('0x') ? params.channelId : `0x${params.channelId}`,
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
        return encodedCallData
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
        channelNetworkId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Channels.write(signer).updateChannel(channelId, '', disabled)
    }

    public async getTownMembershipTokenAddress(spaceId: string): Promise<string> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Membership.address
    }

    public async joinTown(
        spaceId: string,
        recipient: string,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Membership.write(signer).joinSpace(recipient)
    }

    public async hasTownMembership(spaceId: string, address: string): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Membership.hasMembership(address)
    }

    public async getMembershipSupply(spaceId: string) {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const totalSupply = await town.Membership.read.totalSupply()

        return { totalSupply: totalSupply.toNumber() }
    }

    public async getMembershipInfo(spaceId: string) {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const [price, limit, currency, feeRecipient, duration, totalSupply] = await Promise.all([
            town.Membership.read.getMembershipPrice(),
            town.Membership.read.getMembershipLimit(),
            town.Membership.read.getMembershipCurrency(),
            town.Membership.read.getMembershipFeeRecipient(),
            town.Membership.read.getMembershipDuration(),
            town.Membership.read.totalSupply(),
        ])

        return {
            price: price.toNumber(),
            maxSupply: limit.toNumber(),
            currency: currency,
            feeRecipient: feeRecipient,
            duration: duration.toNumber(),
            totalSupply: totalSupply.toNumber(),
        }
    }

    public getWalletLink(): WalletLink {
        return this.walletLink
    }

    public getTown(townId: string): Promise<Town | undefined> {
        return this.townRegistrar.getTown(townId)
    }

    public listPricingModules(): Promise<PricingModuleStruct[]> {
        return this.pricingModules.listPricingModules()
    }

    private async encodeUpdateChannelRoles(
        town: Town,
        channelNetworkId: string,
        _updatedRoleIds: number[],
    ): Promise<BytesLike[]> {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
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

    private encodeAddRolesToChannel(
        town: Town,
        channelNetworkId: string,
        roleIds: number[],
    ): BytesLike[] {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
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
        channelNetworkId: string,
        roleIds: number[],
    ): BytesLike[] {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
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

    public async createUpdatedEntitlements(
        town: Town,
        params: UpdateRoleParams,
    ): Promise<IRolesBase.CreateEntitlementStruct[]> {
        const updatedEntitlements: IRolesBase.CreateEntitlementStruct[] = []
        const [userEntitlement, ruleEntitlement] = await Promise.all([
            town.findEntitlementByType(EntitlementModuleType.UserEntitlement),
            town.findEntitlementByType(EntitlementModuleType.RuleEntitlement),
        ])
        if (params.users.length > 0 && userEntitlement?.address) {
            const entitlementData = createUserEntitlementStruct(
                userEntitlement.address,
                params.users,
            )
            updatedEntitlements.push(entitlementData)
        }
        if (params.ruleData && ruleEntitlement?.address) {
            const entitlementData = createRuleEntitlementStruct(
                ruleEntitlement.address as `0x${string}`,
                params.ruleData,
            )
            updatedEntitlements.push(entitlementData)
        }
        return updatedEntitlements
    }

    public getSpaceAddress(receipt: ContractReceipt): string | undefined {
        const eventName = 'SpaceCreated'
        if (receipt.status !== 1) {
            return undefined
        }
        for (const receiptLog of receipt.logs) {
            try {
                // Parse the log with the contract interface
                const parsedLog = this.townRegistrar.TownArchitect.interface.parseLog(receiptLog)
                if (parsedLog.name === eventName) {
                    // If the log matches the event we're looking for, do something with it
                    // parsedLog.args contains the event arguments as an object
                    logger.log(`Event ${eventName} found: `, parsedLog.args)
                    return parsedLog.args.space as string
                }
            } catch (error) {
                // This log wasn't from the contract we're interested in
            }
        }
        return undefined
    }
}
