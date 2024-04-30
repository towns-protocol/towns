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
import {
    ContractEventListener,
    CreateSpaceParams,
    ISpaceDapp,
    TransactionOpts,
    UpdateChannelParams,
    UpdateRoleParams,
} from '../ISpaceDapp'
import { createRuleEntitlementStruct, createUserEntitlementStruct } from '../ConvertersEntitlements'

import { IRolesBase } from './IRolesShim'
import { Space } from './Space'
import { SpaceRegistrar } from './SpaceRegistrar'
import { createEntitlementStruct } from '../ConvertersRoles'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { WalletLink } from './WalletLink'
import { SpaceInfo } from '../types'
import { IRuleEntitlement } from './index'
import { PricingModules } from './PricingModules'
import { IPrepayShim } from './IPrepayShim'
import { dlogger, isJest } from '@river-build/dlog'

const logger = dlogger('csb:SpaceDapp:debug')

export class SpaceDapp implements ISpaceDapp {
    public readonly config: BaseChainConfig
    public readonly provider: ethers.providers.Provider
    public readonly spaceRegistrar: SpaceRegistrar
    public readonly pricingModules: PricingModules
    public readonly walletLink: WalletLink
    public readonly prepay: IPrepayShim

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        this.config = config
        this.provider = provider
        this.spaceRegistrar = new SpaceRegistrar(config, provider)
        this.walletLink = new WalletLink(config, provider)
        this.pricingModules = new PricingModules(config, provider)
        this.prepay = new IPrepayShim(
            config.addresses.spaceFactory,
            config.contractVersion,
            provider,
        )
    }

    public async addRoleToChannel(
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return wrapTransaction(
            () => space.Channels.write(signer).addRoleToChannel(channelNetworkId, roleId),
            txnOpts,
        )
    }

    public async banWalletAddress(
        spaceId: string,
        walletAddress: string,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const token = await space.Membership.read.getTokenIdByMembership(walletAddress)
        return wrapTransaction(() => space.Banning.write(signer).ban(token), txnOpts)
    }

    public async unbanWalletAddress(
        spaceId: string,
        walletAddress: string,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const token = await space.Membership.read.getTokenIdByMembership(walletAddress)
        return wrapTransaction(() => space.Banning.write(signer).unban(token), txnOpts)
    }

    public async walletAddressIsBanned(spaceId: string, walletAddress: string): Promise<boolean> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const token = await space.Membership.read.getTokenIdByMembership(walletAddress)
        return await space.Banning.read.isBanned(token)
    }

    public async bannedWalletAddresses(spaceId: string): Promise<string[]> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const bannedTokenIds = await space.Banning.read.banned()
        const bannedWalletAddresses = await Promise.all(
            bannedTokenIds.map(async (tokenId) => await space.Membership.read.ownerOf(tokenId)),
        )
        return bannedWalletAddresses
    }

    public async createSpace(
        params: CreateSpaceParams,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const spaceInfo = {
            name: params.spaceName,
            uri: params.spaceMetadata,
            membership: params.membership as any,
            channel: {
                metadata: params.channelName || '',
            },
        }
        return wrapTransaction(
            () => this.spaceRegistrar.SpaceArchitect.write(signer).createSpace(spaceInfo),
            txnOpts,
        )
    }

    public async createChannel(
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        return wrapTransaction(
            () => space.Channels.write(signer).createChannel(channelId, channelName, roleIds),
            txnOpts,
        )
    }

    public async createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlement.RuleDataStruct,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const entitlements = await createEntitlementStruct(space, users, ruleData)
        return wrapTransaction(
            () => space.Roles.write(signer).createRole(roleName, permissions, entitlements),
            txnOpts,
        )
    }

    public async deleteRole(
        spaceId: string,
        roleId: number,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return wrapTransaction(() => space.Roles.write(signer).removeRole(roleId), txnOpts)
    }

    public async getChannels(spaceId: string): Promise<ChannelMetadata[]> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.getChannels()
    }

    public async getChannelDetails(
        spaceId: string,
        channelNetworkId: string,
    ): Promise<ChannelDetails | null> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        return space.getChannel(channelId)
    }

    public async getPermissionsByRoleId(spaceId: string, roleId: number): Promise<Permission[]> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.getPermissionsByRoleId(roleId)
    }

    public async getRole(spaceId: string, roleId: number): Promise<RoleDetails | null> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.getRole(roleId)
    }

    public async getRoles(spaceId: string): Promise<BasicRoleInfo[]> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const roles: IRolesBase.RoleStructOutput[] = await space.Roles.read.getRoles()
        return roles.map((role) => ({
            roleId: role.id.toNumber(),
            name: role.name,
        }))
    }

    public async getSpaceInfo(spaceId: string): Promise<SpaceInfo | undefined> {
        const space = this.getSpace(spaceId)
        if (!space) {
            return undefined
        }
        const [owner, disabled, spaceInfo] = await Promise.all([
            space.Ownable.read.owner(),
            space.Pausable.read.paused(),
            space.getSpaceInfo(),
        ])
        return {
            address: space.Address,
            networkId: space.SpaceId,
            name: (spaceInfo.name as string) ?? '',
            owner,
            disabled,
        }
    }

    public async updateSpaceName(
        spaceId: string,
        name: string,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const spaceInfo = await space.getSpaceInfo()
        // update the space name
        return wrapTransaction(
            () =>
                space.SpaceOwner.write(signer).updateSpaceInfo(space.Address, name, spaceInfo.uri),
            txnOpts,
        )
    }

    public async isEntitledToSpace(
        spaceId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const space = this.getSpace(spaceId)
        if (!space) {
            return false
        }
        return space.Entitlements.read.isEntitledToSpace(user, permission)
    }

    public async isEntitledToChannel(
        spaceId: string,
        channelNetworkId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const space = this.getSpace(spaceId)
        if (!space) {
            return false
        }
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`

        return space.Entitlements.read.isEntitledToChannel(channelId, user, permission)
    }

    public parseSpaceFactoryError(error: unknown): Error {
        if (!this.spaceRegistrar.SpaceArchitect) {
            throw new Error('SpaceArchitect is not deployed properly.')
        }
        const decodedErr = this.spaceRegistrar.SpaceArchitect.parseError(error)
        logger.error(decodedErr)
        return decodedErr
    }

    public async parseSpaceError(spaceId: string, error: unknown): Promise<Error> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const decodedErr = space.parseError(error)
        logger.error(decodedErr)
        return decodedErr
    }

    public parsePrepayError(error: unknown): Error {
        if (!this.prepay) {
            throw new Error('Prepay is not deployed properly.')
        }
        const decodedErr = this.prepay.parseError(error)
        logger.error(decodedErr)
        return decodedErr
    }

    public async parseSpaceLogs(
        spaceId: string,
        logs: ethers.providers.Log[],
    ): Promise<(ethers.utils.LogDescription | undefined)[]> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return logs.map((spaceLog) => {
            try {
                return space.parseLog(spaceLog)
            } catch (err) {
                logger.error(err)
                return
            }
        })
    }

    public async updateChannel(
        params: UpdateChannelParams,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(params.spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceId}" is not found.`)
        }
        const encodedCallData = await this.encodedUpdateChannelData(space, params)
        return wrapTransaction(
            () => space.Multicall.write(signer).multicall(encodedCallData),
            txnOpts,
        )
    }

    public async encodedUpdateChannelData(space: Space, params: UpdateChannelParams) {
        // data for the multicall
        const encodedCallData: BytesLike[] = []
        // update the channel metadata
        encodedCallData.push(
            space.Channels.interface.encodeFunctionData('updateChannel', [
                params.channelId.startsWith('0x') ? params.channelId : `0x${params.channelId}`,
                params.channelName,
                params.disabled ?? false, // default to false
            ]),
        )
        // update any channel role changes
        const encodedUpdateChannelRoles = await this.encodeUpdateChannelRoles(
            space,
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
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(params.spaceNetworkId)
        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceNetworkId}" is not found.`)
        }
        const updatedEntitlemets = await this.createUpdatedEntitlements(space, params)
        return wrapTransaction(
            () =>
                space.Roles.write(signer).updateRole(
                    params.roleId,
                    params.roleName,
                    params.permissions,
                    updatedEntitlemets,
                ),
            txnOpts,
        )
    }

    public async setSpaceAccess(
        spaceId: string,
        disabled: boolean,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        if (disabled) {
            return wrapTransaction(() => space.Pausable.write(signer).pause(), txnOpts)
        } else {
            return wrapTransaction(() => space.Pausable.write(signer).unpause(), txnOpts)
        }
    }

    /**
     *
     * @param spaceId
     * @param priceInWei
     * @param signer
     */
    public async setMembershipPrice(
        spaceId: string,
        priceInWei: ethers.BigNumberish,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return wrapTransaction(
            () => space.Membership.write(signer).setMembershipPrice(priceInWei),
            txnOpts,
        )
    }

    public async setMembershipPricingModule(
        spaceId: string,
        pricingModule: string,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return wrapTransaction(
            () => space.Membership.write(signer).setMembershipPricingModule(pricingModule),
            txnOpts,
        )
    }

    public async setMembershipLimit(
        spaceId: string,
        limit: number,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return wrapTransaction(
            () => space.Membership.write(signer).setMembershipLimit(limit),
            txnOpts,
        )
    }

    public async setMembershipFreeAllocation(
        spaceId: string,
        freeAllocation: number,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return wrapTransaction(
            () => space.Membership.write(signer).setMembershipFreeAllocation(freeAllocation),
            txnOpts,
        )
    }

    public async prepayMembership(
        spaceId: string,
        supply: number,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const membershipAddress = space.Membership.address
        return wrapTransaction(
            () => this.prepay.write(signer).prepayMembership(membershipAddress, supply),
            txnOpts,
        )
    }

    public async getPrepaidMembershipSupply(spaceId: string) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const membershipAddress = space.Membership.address
        return this.prepay.read.prepaidMembershipSupply(membershipAddress)
    }

    public async setChannelAccess(
        spaceId: string,
        channelNetworkId: string,
        disabled: boolean,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return wrapTransaction(
            () => space.Channels.write(signer).updateChannel(channelId, '', disabled),
            txnOpts,
        )
    }

    public async getSpaceMembershipTokenAddress(spaceId: string): Promise<string> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.Membership.address
    }

    public async joinSpace(
        spaceId: string,
        recipient: string,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const price = await space.Membership.read.getMembershipPrice()
        return wrapTransaction(
            () =>
                space.Membership.write(signer).joinSpace(recipient, {
                    value: price,
                }),
            txnOpts,
        )
    }

    public async hasSpaceMembership(spaceId: string, address: string): Promise<boolean> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.Membership.hasMembership(address)
    }

    public async getMembershipSupply(spaceId: string) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const totalSupply = await space.Membership.read.totalSupply()

        return { totalSupply: totalSupply.toNumber() }
    }

    public async getMembershipInfo(spaceId: string) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const [price, limit, currency, feeRecipient, duration, totalSupply, pricingModule] =
            await Promise.all([
                space.Membership.read.getMembershipPrice(),
                space.Membership.read.getMembershipLimit(),
                space.Membership.read.getMembershipCurrency(),
                space.Ownable.read.owner(),
                space.Membership.read.getMembershipDuration(),
                space.Membership.read.totalSupply(),
                space.Membership.read.getMembershipPricingModule(),
            ])

        return {
            price: price, // keep as BigNumber (wei)
            maxSupply: limit.toNumber(),
            currency: currency,
            feeRecipient: feeRecipient,
            duration: duration.toNumber(),
            totalSupply: totalSupply.toNumber(),
            pricingModule: pricingModule,
        }
    }

    public getWalletLink(): WalletLink {
        return this.walletLink
    }

    public getSpace(spaceId: string): Space | undefined {
        return this.spaceRegistrar.getSpace(spaceId)
    }

    public listPricingModules(): Promise<PricingModuleStruct[]> {
        return this.pricingModules.listPricingModules()
    }

    private async encodeUpdateChannelRoles(
        space: Space,
        channelNetworkId: string,
        _updatedRoleIds: number[],
    ): Promise<BytesLike[]> {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        const encodedCallData: BytesLike[] = []
        const [channelInfo] = await Promise.all([
            space.Channels.read.getChannel(channelId),
            space.getEntitlementShims(),
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
        const encodedRemoveRoles = this.encodeRemoveRolesFromChannel(
            space,
            channelId,
            rolesToRemove,
        )
        for (const callData of encodedRemoveRoles) {
            encodedCallData.push(callData)
        }
        // encode the call data for each role to add
        const encodedAddRoles = this.encodeAddRolesToChannel(space, channelId, rolesToAdd)
        for (const callData of encodedAddRoles) {
            encodedCallData.push(callData)
        }
        return encodedCallData
    }

    private encodeAddRolesToChannel(
        space: Space,
        channelNetworkId: string,
        roleIds: number[],
    ): BytesLike[] {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        const encodedCallData: BytesLike[] = []
        for (const roleId of roleIds) {
            const encodedBytes = space.Channels.interface.encodeFunctionData('addRoleToChannel', [
                channelId,
                roleId,
            ])
            encodedCallData.push(encodedBytes)
        }
        return encodedCallData
    }

    private encodeRemoveRolesFromChannel(
        space: Space,
        channelNetworkId: string,
        roleIds: number[],
    ): BytesLike[] {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        const encodedCallData: BytesLike[] = []
        for (const roleId of roleIds) {
            const encodedBytes = space.Channels.interface.encodeFunctionData(
                'removeRoleFromChannel',
                [channelId, roleId],
            )
            encodedCallData.push(encodedBytes)
        }
        return encodedCallData
    }

    public async createUpdatedEntitlements(
        space: Space,
        params: UpdateRoleParams,
    ): Promise<IRolesBase.CreateEntitlementStruct[]> {
        const updatedEntitlements: IRolesBase.CreateEntitlementStruct[] = []
        const [userEntitlement, ruleEntitlement] = await Promise.all([
            space.findEntitlementByType(EntitlementModuleType.UserEntitlement),
            space.findEntitlementByType(EntitlementModuleType.RuleEntitlement),
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
                const parsedLog = this.spaceRegistrar.SpaceArchitect.interface.parseLog(receiptLog)
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

    public listenForMembershipEvent(spaceId: string, receiver: string): ContractEventListener {
        const space = this.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const membershipPromises = Promise.race([
            space.Membership.waitForMembershipTokenIssued(receiver).then((result) => {
                return {
                    receiver: result,
                    success: true,
                }
            }),
            space.Membership.waitForMembershipTokenRejected(receiver).then((result) => {
                return {
                    receiver: result,
                    success: false,
                }
            }),
        ])

        return {
            wait: async () => {
                return new Promise<{
                    receiver: string
                    success: boolean
                }>((resolve) => {
                    const timeout = setTimeout(() => {
                        logger.log('Membership mint event timed out')
                        resolve({
                            success: false,
                            receiver: receiver,
                        })
                    }, 30_000)

                    membershipPromises
                        .then((result) => {
                            clearTimeout(timeout)
                            resolve(result)
                        })
                        .catch((error) => {
                            clearTimeout(timeout)
                            logger.error('Error waiting for membership mint event', error)
                            resolve({
                                success: false,
                                receiver: receiver,
                            })
                        })
                })
            },
        }
    }
}

async function wrapTransaction(
    txFn: () => Promise<ContractTransaction>,
    txnOpts?: TransactionOpts,
): Promise<ContractTransaction> {
    const tx = await txFn()
    if (!txnOpts) {
        txnOpts = isJest() ? { retryCount: 3 } : { retryCount: 0 }
    }
    if ((txnOpts.retryCount ?? 0) === 0) {
        return tx
    }
    let wait = tx.wait.bind(tx)
    tx.wait = async function (confirmations?: number) {
        let retryCount = 0
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const receipt = await wait(confirmations)
                return receipt
            } catch (error) {
                retryCount++
                const bRetrying = retryCount < (txnOpts?.retryCount ?? 0)
                logger.error('Transaction failed', { error, retryCount, bRetrying })
                if (!bRetrying) {
                    throw error
                } else {
                    logger.info('Waiting 1 sec for retry', { retryCount })
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                    const retryTx = await txFn()
                    wait = retryTx.wait.bind(retryTx)
                }
            }
        }
    }

    return tx
}
