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
    CreateSpaceParams,
    ISpaceDapp,
    TransactionOpts,
    UpdateChannelParams,
    UpdateRoleParams,
} from '../ISpaceDapp'

import { IRolesBase } from './IRolesShim'
import { Space } from './Space'
import { SpaceRegistrar } from './SpaceRegistrar'
import { createEntitlementStruct } from '../ConvertersRoles'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { WalletLink } from './WalletLink'
import { SpaceInfo } from '../types'
import { IRuleEntitlement, UNKNOWN_ERROR, UserEntitlementShim } from './index'
import { PricingModules } from './PricingModules'
import { IPrepayShim } from './IPrepayShim'
import { dlogger, isJest } from '@river-build/dlog'
import { EVERYONE_ADDRESS, stringifyChannelMetadataJSON } from '../Utils'
import { evaluateOperationsForEntitledWallet, ruleDataToOperations } from '../entitlement'
import { RuleEntitlementShim } from './RuleEntitlementShim'
import { PlatformRequirements } from './PlatformRequirements'

const logger = dlogger('csb:SpaceDapp:debug')

export class SpaceDapp implements ISpaceDapp {
    public readonly config: BaseChainConfig
    public readonly provider: ethers.providers.Provider
    public readonly spaceRegistrar: SpaceRegistrar
    public readonly pricingModules: PricingModules
    public readonly walletLink: WalletLink
    public readonly prepay: IPrepayShim
    public readonly platformRequirements: PlatformRequirements

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
        this.platformRequirements = new PlatformRequirements(
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
        const token = await space.ERC721AQueryable.read
            .tokensOfOwner(walletAddress)
            .then((tokens) => tokens[0])
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
        const token = await space.ERC721AQueryable.read
            .tokensOfOwner(walletAddress)
            .then((tokens) => tokens[0])
        return wrapTransaction(() => space.Banning.write(signer).unban(token), txnOpts)
    }

    public async walletAddressIsBanned(spaceId: string, walletAddress: string): Promise<boolean> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const token = await space.ERC721AQueryable.read
            .tokensOfOwner(walletAddress)
            .then((tokens) => tokens[0])
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
        channelDescription: string,
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
            () =>
                space.Channels.write(signer).createChannel(
                    channelId,
                    stringifyChannelMetadataJSON({
                        name: channelName,
                        description: channelDescription,
                    }),
                    roleIds,
                ),
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

    private async getEntitlementsForPermission(spaceId: string, permission: Permission) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const entitlementData =
            await space.EntitlementDataQueryable.read.getEntitlementDataByPermission(permission)

        type EntitlementData = {
            entitlementType: EntitlementModuleType
            ruleEntitlement: IRuleEntitlement.RuleDataStruct[] | undefined
            userEntitlement: string[] | undefined
        }

        const entitlements: EntitlementData[] = entitlementData.map((x) => ({
            entitlementType: x.entitlementType as EntitlementModuleType,
            ruleEntitlement: undefined,
            userEntitlement: undefined,
        }))

        const [userEntitlementShim, ruleEntitlementShim] = (await Promise.all([
            space.findEntitlementByType(EntitlementModuleType.UserEntitlement),
            space.findEntitlementByType(EntitlementModuleType.RuleEntitlement),
        ])) as [UserEntitlementShim | null, RuleEntitlementShim | null]

        for (let i = 0; i < entitlementData.length; i++) {
            const entitlement = entitlementData[i]
            if (
                (entitlement.entitlementType as EntitlementModuleType) ===
                EntitlementModuleType.RuleEntitlement
            ) {
                entitlements[i].entitlementType = EntitlementModuleType.RuleEntitlement
                const decodedData = ruleEntitlementShim?.decodeGetRuleData(
                    entitlement.entitlementData,
                )
                if (decodedData) {
                    entitlements[i].ruleEntitlement = decodedData
                }
            } else if (
                (entitlement.entitlementType as EntitlementModuleType) ===
                EntitlementModuleType.UserEntitlement
            ) {
                entitlements[i].entitlementType = EntitlementModuleType.UserEntitlement
                const decodedData = userEntitlementShim?.decodeGetAddresses(
                    entitlement.entitlementData,
                )
                if (decodedData) {
                    entitlements[i].userEntitlement = decodedData
                }
            } else {
                throw new Error('Unknown entitlement type')
            }
        }

        return entitlements
    }

    /**
     * Checks if user has a wallet entitled to join a space based on the minter role rule entitlements
     */
    public async getEntitledWalletForJoiningSpace(
        spaceId: string,
        rootKey: string,
        supportedXChainRpcUrls: string[],
    ): Promise<string | undefined> {
        const linkedWallets = await this.walletLink.getLinkedWallets(rootKey)
        const allWallets = [rootKey, ...linkedWallets]

        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const entitlements = await this.getEntitlementsForPermission(spaceId, Permission.JoinSpace)

        const isEveryOneSpace = entitlements.some((e) =>
            e.userEntitlement?.includes(EVERYONE_ADDRESS),
        )

        // todo: more user checks
        if (isEveryOneSpace) {
            return rootKey
        }

        const providers = supportedXChainRpcUrls.map(
            (url) => new ethers.providers.StaticJsonRpcProvider(url),
        )
        await Promise.all(providers.map((p) => p.ready))

        const ruleEntitlements = entitlements
            .filter((x) => x.entitlementType === EntitlementModuleType.RuleEntitlement)
            .map((x) => x.ruleEntitlement)

        const entitledWalletsForAllRuleEntitlements = await Promise.all(
            ruleEntitlements.map(async (ruleData) => {
                if (!ruleData) {
                    throw new Error('Rule data not found')
                }
                const operations = ruleDataToOperations(ruleData)

                return evaluateOperationsForEntitledWallet(operations, allWallets, providers)
            }),
        )

        // if every check has an entitled wallet, return the first one
        if (
            entitledWalletsForAllRuleEntitlements.every((w) => w !== ethers.constants.AddressZero)
        ) {
            return entitledWalletsForAllRuleEntitlements[0]
        }
        return
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
        if (permission === Permission.JoinSpace) {
            throw new Error('use getEntitledWalletForJoiningSpace instead of isEntitledToSpace')
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

    public parseSpaceError(spaceId: string, error: unknown): Error {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const decodedErr = space.parseError(error)
        logger.error(decodedErr)
        return decodedErr
    }

    /**
     * Attempts to parse an error against all contracts
     * If you're error is not showing any data with this call, make sure the contract is listed either in parseSpaceError or nonSpaceContracts
     * @param args
     * @returns
     */
    public parseAllContractErrors(args: { spaceId?: string; error: unknown }): Error {
        let err: Error | undefined
        if (args.spaceId) {
            err = this.parseSpaceError(args.spaceId, args.error)
        }
        if (err && err?.name !== UNKNOWN_ERROR) {
            return err
        }
        err = this.spaceRegistrar.SpaceArchitect.parseError(args.error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        const nonSpaceContracts = [this.pricingModules, this.prepay, this.walletLink]
        for (const contract of nonSpaceContracts) {
            err = contract.parseError(args.error)
            if (err?.name !== UNKNOWN_ERROR) {
                return err
            }
        }
        return err
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
                stringifyChannelMetadataJSON({
                    name: params.channelName,
                    description: params.channelDescription,
                }),
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
        const cost = await this.prepay.read.calculateMembershipPrepayFee(supply)

        return wrapTransaction(
            () =>
                this.prepay.write(signer).prepayMembership(membershipAddress, supply, {
                    value: cost,
                }),
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
    ): Promise<{ issued: true; tokenId: string } | { issued: false; tokenId: undefined }> {
        const joinSpaceStart = Date.now()

        logger.log('joinSpace result before wrap', spaceId)

        const getSpaceStart = Date.now()
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const issuedListener = space.Membership.listenForMembershipToken(recipient)

        const blockNumber = await space.provider?.getBlockNumber()

        logger.log('joinSpace before blockNumber', Date.now() - getSpaceStart, blockNumber)
        const getPriceStart = Date.now()
        const price = await space.Membership.read.getMembershipPrice()
        logger.log('joinSpace getMembershipPrice', Date.now() - getPriceStart)
        const wrapStart = Date.now()
        const result = await wrapTransaction(async () => {
            // Set gas limit instead of using estimateGas
            // As the estimateGas is not reliable for this contract
            return await space.Membership.write(signer).joinSpace(recipient, {
                gasLimit: 1_500_000,
                value: price,
            })
        }, txnOpts)

        const blockNumberAfterTx = await space.provider?.getBlockNumber()

        logger.log('joinSpace wrap', Date.now() - wrapStart, blockNumberAfterTx)

        const issued = await issuedListener

        const blockNumberAfter = await space.provider?.getBlockNumber()

        logger.log(
            'joinSpace after blockNumber',
            Date.now() - joinSpaceStart,
            blockNumberAfter,
            result,
            issued,
        )
        return issued
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
        return createEntitlementStruct(space, params.users, params.ruleData)
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

    // If the caller doesn't provide an abort controller, listenForMembershipToken will create one
    public listenForMembershipEvent(
        spaceId: string,
        receiver: string,
        abortController?: AbortController,
    ): Promise<
        | { issued: true; tokenId: string; error?: Error | undefined }
        | { issued: false; tokenId: undefined; error?: Error | undefined }
    > {
        const space = this.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        return space.Membership.listenForMembershipToken(receiver, abortController)
    }
}

// Retry submitting the transaction N times (3 by default in jest, 0 by default elsewhere)
// and then wait until the first confirmation of the transaction has been mined
// works around gas estimation issues and other transient issues that are more common in running CI tests
// so by default we only retry when running under jest
// this wrapper unifies all of the wrapped contract calls in behvior, they don't return until
// the transaction is confirmed
async function wrapTransaction(
    txFn: () => Promise<ContractTransaction>,
    txnOpts?: TransactionOpts,
): Promise<ContractTransaction> {
    const retryLimit = txnOpts?.retryCount ?? isJest() ? 3 : 0

    const runTx = async () => {
        let retryCount = 0
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const txStart = Date.now()
                const tx = await txFn()
                logger.log('Transaction submitted in', Date.now() - txStart)
                const startConfirm = Date.now()
                await confirmTransaction(tx)
                logger.log('Transaction confirmed in', Date.now() - startConfirm)
                // return the transaction, as it was successful
                // the caller can wait() on it again if they want to wait for more confirmations
                return tx
            } catch (error) {
                retryCount++
                if (retryCount >= retryLimit) {
                    throw new Error('Transaction failed after retries: ' + (error as Error).message)
                }
                logger.error('Transaction submission failed, retrying...', { error, retryCount })
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }
    }

    // Wait until the first confirmation of the transaction
    const confirmTransaction = async (tx: ContractTransaction) => {
        let waitRetryCount = 0
        let errorCount = 0
        const start = Date.now()
        // eslint-disable-next-line no-constant-condition
        while (true) {
            let receipt: ContractReceipt | null = null
            try {
                receipt = await tx.wait(0)
            } catch (error) {
                if (
                    typeof error === 'object' &&
                    error !== null &&
                    'code' in error &&
                    (error as { code: unknown }).code === 'CALL_EXCEPTION'
                ) {
                    logger.error('Transaction failed', { tx, errorCount, error })
                    throw new Error('Transaction confirmed but failed')
                }

                // If the transaction receipt is not available yet, the error may be thrown
                // We can ignore it and retry after a short delay
                errorCount++
                receipt = null
            }
            if (!receipt) {
                // Transaction not minded yet, try again in 100ms
                waitRetryCount++
                await new Promise((resolve) => setTimeout(resolve, 100))
            } else if (receipt.status === 1) {
                return
            } else {
                logger.error('Transaction failed in an unexpected way', {
                    tx,
                    receipt,
                    errorCount,
                })
                // Transaction failed, throw an error and the outer loop will retry
                throw new Error('Transaction confirmed but failed')
            }
            const waitRetryTime = Date.now() - start
            // If we've been waiting for more than 20 seconds, log an error
            // and outer loop will resubmit the transaction
            if (waitRetryTime > 20_000) {
                logger.error('Transaction confirmation timed out', {
                    waitRetryTime,
                    waitRetryCount,
                    tx,
                    errorCount,
                })
                throw new Error(
                    'Transaction confirmation timed out after: ' +
                        waitRetryTime +
                        ' waitRetryCount: ' +
                        waitRetryCount,
                )
            }
        }
    }
    return await runTx()
}
