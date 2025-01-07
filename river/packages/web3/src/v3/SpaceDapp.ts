import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    EntitlementModuleType,
    isPermission,
    isUpdateChannelStatusParams,
    MembershipInfo,
    Permission,
    PricingModuleStruct,
    RoleDetails,
    VersionedRuleData,
} from '../ContractTypes'
import { BytesLike, ContractReceipt, ContractTransaction, ethers } from 'ethers'
import {
    CreateLegacySpaceParams,
    CreateSpaceParams,
    ISpaceDapp,
    TransactionOpts,
    LegacyUpdateRoleParams,
    UpdateRoleParams,
    SetChannelPermissionOverridesParams,
    ClearChannelPermissionOverridesParams,
    RemoveChannelParams,
    UpdateChannelParams,
} from '../ISpaceDapp'
import { LOCALHOST_CHAIN_ID } from '../Web3Constants'
import { IRolesBase } from './IRolesShim'
import { Space } from './Space'
import { SpaceRegistrar } from './SpaceRegistrar'
import { createEntitlementStruct, createLegacyEntitlementStruct } from '../ConvertersRoles'
import { convertRuleDataV1ToV2 } from '../ConvertersEntitlements'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { WalletLink, INVALID_ADDRESS } from './WalletLink'
import { SpaceInfo } from '../types'
import {
    IRuleEntitlementBase,
    IRuleEntitlementV2Base,
    RiverAirdropDapp,
    UNKNOWN_ERROR,
    UserEntitlementShim,
} from './index'
import { PricingModules } from './PricingModules'
import { dlogger, isTestEnv } from '@river-build/dlog'
import { EVERYONE_ADDRESS, stringifyChannelMetadataJSON, NoEntitledWalletError } from '../Utils'
import {
    XchainConfig,
    evaluateOperationsForEntitledWallet,
    ruleDataToOperations,
} from '../entitlement'
import { RuleEntitlementShim } from './RuleEntitlementShim'
import { PlatformRequirements } from './PlatformRequirements'
import { EntitlementDataStructOutput } from './IEntitlementDataQueryableShim'
import { CacheResult, EntitlementCache, Keyable } from '../EntitlementCache'
import { RuleEntitlementV2Shim } from './RuleEntitlementV2Shim'
import { TipEventObject } from '@river-build/generated/dev/typings/ITipping'

const logger = dlogger('csb:SpaceDapp:debug')

type EntitlementData = {
    entitlementType: EntitlementModuleType
    ruleEntitlement: VersionedRuleData | undefined
    userEntitlement: string[] | undefined
}

class EntitlementDataCacheResult implements CacheResult<EntitlementData[]> {
    value: EntitlementData[]
    cacheHit: boolean
    isPositive: boolean
    constructor(value: EntitlementData[]) {
        this.value = value
        this.cacheHit = false
        this.isPositive = true
    }
}

class EntitledWalletCacheResult implements CacheResult<EntitledWallet> {
    value: EntitledWallet
    cacheHit: boolean
    isPositive: boolean
    constructor(value: EntitledWallet) {
        this.value = value
        this.cacheHit = false
        this.isPositive = value !== undefined
    }
}

class BooleanCacheResult implements CacheResult<boolean> {
    value: boolean
    cacheHit: boolean
    isPositive: boolean
    constructor(value: boolean) {
        this.value = value
        this.cacheHit = false
        this.isPositive = value
    }
}

class EntitlementRequest implements Keyable {
    spaceId: string
    channelId: string
    userId: string
    permission: Permission
    constructor(spaceId: string, channelId: string, userId: string, permission: Permission) {
        this.spaceId = spaceId
        this.channelId = channelId
        this.userId = userId
        this.permission = permission
    }
    toKey(): string {
        return `{spaceId:${this.spaceId},channelId:${this.channelId},userId:${this.userId},permission:${this.permission}}`
    }
}

function newSpaceEntitlementEvaluationRequest(
    spaceId: string,
    userId: string,
    permission: Permission,
): EntitlementRequest {
    return new EntitlementRequest(spaceId, '', userId, permission)
}

function newChannelEntitlementEvaluationRequest(
    spaceId: string,
    channelId: string,
    userId: string,
    permission: Permission,
): EntitlementRequest {
    return new EntitlementRequest(spaceId, channelId, userId, permission)
}

function newSpaceEntitlementRequest(spaceId: string, permission: Permission): EntitlementRequest {
    return new EntitlementRequest(spaceId, '', '', permission)
}

function newChannelEntitlementRequest(
    spaceId: string,
    channelId: string,
    permission: Permission,
): EntitlementRequest {
    return new EntitlementRequest(spaceId, channelId, '', permission)
}

function ensureHexPrefix(value: string): string {
    return value.startsWith('0x') ? value : `0x${value}`
}

const EmptyXchainConfig: XchainConfig = {
    supportedRpcUrls: {},
    etherBasedChains: [],
}

type EntitledWallet = string | undefined
export class SpaceDapp implements ISpaceDapp {
    private isLegacySpaceCache: Map<string, boolean>
    public readonly config: BaseChainConfig
    public readonly provider: ethers.providers.Provider
    public readonly spaceRegistrar: SpaceRegistrar
    public readonly pricingModules: PricingModules
    public readonly walletLink: WalletLink
    public readonly platformRequirements: PlatformRequirements
    public readonly airdrop: RiverAirdropDapp

    public readonly entitlementCache: EntitlementCache<EntitlementRequest, EntitlementData[]>
    public readonly entitledWalletCache: EntitlementCache<EntitlementRequest, EntitledWallet>
    public readonly entitlementEvaluationCache: EntitlementCache<EntitlementRequest, boolean>

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        this.isLegacySpaceCache = new Map()
        this.config = config
        this.provider = provider
        this.spaceRegistrar = new SpaceRegistrar(config, provider)
        this.walletLink = new WalletLink(config, provider)
        this.pricingModules = new PricingModules(config, provider)
        this.platformRequirements = new PlatformRequirements(
            config.addresses.spaceFactory,
            provider,
        )
        this.airdrop = new RiverAirdropDapp(config, provider)

        // For RPC providers that pool for events, we need to set the polling interval to a lower value
        // so that we don't miss events that may be emitted in between polling intervals. The Ethers
        // default is 4000ms, which is based on the assumption of 12s mainnet blocktimes.
        if ('pollingInterval' in provider && typeof provider.pollingInterval === 'number') {
            provider.pollingInterval = 250
        }

        const isLocalDev = isTestEnv() || config.chainId === LOCALHOST_CHAIN_ID
        const cacheOpts = {
            positiveCacheTTLSeconds: isLocalDev ? 5 : 15 * 60,
            negativeCacheTTLSeconds: 2,
        }
        this.entitlementCache = new EntitlementCache(cacheOpts)
        this.entitledWalletCache = new EntitlementCache(cacheOpts)
        this.entitlementEvaluationCache = new EntitlementCache(cacheOpts)
    }

    public async isLegacySpace(spaceId: string): Promise<boolean> {
        const cachedValue = this.isLegacySpaceCache.get(spaceId)
        if (cachedValue !== undefined) {
            return cachedValue
        }

        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        // Legacy spaces do not have RuleEntitlementV2
        const maybeShim = await space.findEntitlementByType(EntitlementModuleType.RuleEntitlementV2)
        const isLegacy = maybeShim === null
        this.isLegacySpaceCache.set(spaceId, isLegacy)
        return isLegacy
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
        const channelId = ensureHexPrefix(channelNetworkId)
        return wrapTransaction(
            () => space.Channels.write(signer).addRoleToChannel(channelId, roleId),
            txnOpts,
        )
    }

    public async waitForRoleCreated(
        spaceId: string,
        txn: ContractTransaction,
    ): Promise<{ roleId: number | undefined; error: Error | undefined }> {
        const receipt = await this.provider.waitForTransaction(txn.hash)
        if (receipt.status === 0) {
            return { roleId: undefined, error: new Error('Transaction failed') }
        }

        const parsedLogs = await this.parseSpaceLogs(spaceId, receipt.logs)
        const roleCreatedEvent = parsedLogs.find((log) => log?.name === 'RoleCreated')
        if (!roleCreatedEvent) {
            return { roleId: undefined, error: new Error('RoleCreated event not found') }
        }
        const roleId = (roleCreatedEvent.args[1] as ethers.BigNumber).toNumber()
        return { roleId, error: undefined }
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
            bannedTokenIds.map(async (tokenId) => await space.ERC721A.read.ownerOf(tokenId)),
        )
        return bannedWalletAddresses
    }

    public async createLegacySpace(
        params: CreateLegacySpaceParams,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const spaceInfo = {
            name: params.spaceName,
            uri: params.uri,
            membership: params.membership,
            channel: {
                metadata: params.channelName || '',
            },
            shortDescription: params.shortDescription ?? '',
            longDescription: params.longDescription ?? '',
        }
        return wrapTransaction(
            () => this.spaceRegistrar.LegacySpaceArchitect.write(signer).createSpace(spaceInfo),
            txnOpts,
        )
    }

    public async createSpace(
        params: CreateSpaceParams,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        return wrapTransaction(() => {
            const createSpaceFunction = this.spaceRegistrar.CreateSpace.write(signer)[
                'createSpaceWithPrepay(((string,string,string,string),((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],bytes,bool),string[]),(string),(uint256)))'
            ] as (arg: any) => Promise<ContractTransaction>

            return createSpaceFunction({
                channel: {
                    metadata: params.channelName || '',
                },
                membership: params.membership,
                metadata: {
                    name: params.spaceName,
                    uri: params.uri,
                    longDescription: params.longDescription || '',
                    shortDescription: params.shortDescription || '',
                },
                prepay: {
                    supply: params.prepaySupply ?? 0,
                },
            })
        }, txnOpts)
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
        const channelId = ensureHexPrefix(channelNetworkId)

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

    public async createChannelWithPermissionOverrides(
        spaceId: string,
        channelName: string,
        channelDescription: string,
        channelNetworkId: string,
        roles: { roleId: number; permissions: Permission[] }[],
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const channelId = ensureHexPrefix(channelNetworkId)

        return wrapTransaction(
            () =>
                space.Channels.write(signer).createChannelWithOverridePermissions(
                    channelId,
                    stringifyChannelMetadataJSON({
                        name: channelName,
                        description: channelDescription,
                    }),
                    roles,
                ),
            txnOpts,
        )
    }

    public async legacyCreateRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementBase.RuleDataStruct,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const entitlements = await createLegacyEntitlementStruct(space, users, ruleData)
        return wrapTransaction(
            () => space.Roles.write(signer).createRole(roleName, permissions, entitlements),
            txnOpts,
        )
    }

    public async createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
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

    public async tokenURI(spaceId: string) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const spaceInfo = await space.getSpaceInfo()
        return space.SpaceOwnerErc721A.read.tokenURI(spaceInfo.tokenId)
    }

    public memberTokenURI(spaceId: string, tokenId: string) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.ERC721A.read.tokenURI(tokenId)
    }

    public async getChannelDetails(
        spaceId: string,
        channelNetworkId: string,
    ): Promise<ChannelDetails | null> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const channelId = ensureHexPrefix(channelNetworkId)

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
            uri: (spaceInfo.uri as string) ?? '',
            tokenId: ethers.BigNumber.from(spaceInfo.tokenId).toString(),
            createdAt: ethers.BigNumber.from(spaceInfo.createdAt).toString(),
            shortDescription: (spaceInfo.shortDescription as string) ?? '',
            longDescription: (spaceInfo.longDescription as string) ?? '',
        }
    }

    public async updateSpaceInfo(
        spaceId: string,
        name: string,
        uri: string,
        shortDescription: string,
        longDescription: string,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return wrapTransaction(
            () =>
                space.SpaceOwner.write(signer).updateSpaceInfo(
                    space.Address,
                    name,
                    uri,
                    shortDescription,
                    longDescription,
                ),
            txnOpts,
        )
    }

    private async decodeEntitlementData(
        space: Space,
        entitlementData: EntitlementDataStructOutput[],
    ): Promise<EntitlementData[]> {
        const entitlements: EntitlementData[] = entitlementData.map((x) => ({
            entitlementType: x.entitlementType as EntitlementModuleType,
            ruleEntitlement: undefined,
            userEntitlement: undefined,
        }))

        const [userEntitlementShim, ruleEntitlementShim, ruleEntitlementV2Shim] =
            (await Promise.all([
                space.findEntitlementByType(EntitlementModuleType.UserEntitlement),
                space.findEntitlementByType(EntitlementModuleType.RuleEntitlement),
                space.findEntitlementByType(EntitlementModuleType.RuleEntitlementV2),
            ])) as [
                UserEntitlementShim | null,
                RuleEntitlementShim | null,
                RuleEntitlementV2Shim | null,
            ]

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
                    entitlements[i].ruleEntitlement = {
                        kind: 'v1',
                        rules: decodedData,
                    }
                }
            } else if (
                (entitlement.entitlementType as EntitlementModuleType) ===
                EntitlementModuleType.RuleEntitlementV2
            ) {
                entitlements[i].entitlementType = EntitlementModuleType.RuleEntitlementV2
                const decodedData = ruleEntitlementV2Shim?.decodeGetRuleData(
                    entitlement.entitlementData,
                )
                if (decodedData) {
                    entitlements[i].ruleEntitlement = {
                        kind: 'v2',
                        rules: decodedData,
                    }
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

    private async getEntitlementsForPermission(
        spaceId: string,
        permission: Permission,
    ): Promise<EntitlementData[]> {
        const { value } = await this.entitlementCache.executeUsingCache(
            newSpaceEntitlementRequest(spaceId, permission),
            async (request) => {
                const entitlementData = await this.getEntitlementsForPermissionUncached(
                    request.spaceId,
                    request.permission,
                )
                return new EntitlementDataCacheResult(entitlementData)
            },
        )
        return value
    }

    private async getEntitlementsForPermissionUncached(
        spaceId: string,
        permission: Permission,
    ): Promise<EntitlementData[]> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const entitlementData =
            await space.EntitlementDataQueryable.read.getEntitlementDataByPermission(permission)

        return await this.decodeEntitlementData(space, entitlementData)
    }

    private async getChannelEntitlementsForPermission(
        spaceId: string,
        channelId: string,
        permission: Permission,
    ): Promise<EntitlementData[]> {
        const { value } = await this.entitlementCache.executeUsingCache(
            newChannelEntitlementRequest(spaceId, channelId, permission),
            async (request) => {
                const entitlementData = await this.getChannelEntitlementsForPermissionUncached(
                    request.spaceId,
                    request.channelId,
                    request.permission,
                )
                return new EntitlementDataCacheResult(entitlementData)
            },
        )
        return value
    }

    private async getChannelEntitlementsForPermissionUncached(
        spaceId: string,
        channelId: string,
        permission: Permission,
    ): Promise<EntitlementData[]> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const entitlementData =
            await space.EntitlementDataQueryable.read.getChannelEntitlementDataByPermission(
                channelId,
                permission,
            )
        return await this.decodeEntitlementData(space, entitlementData)
    }

    public async getLinkedWallets(wallet: string): Promise<string[]> {
        let linkedWallets = await this.walletLink.getLinkedWallets(wallet)
        // If there are no linked wallets, consider that the wallet may be linked to another root key.
        if (linkedWallets.length === 0) {
            const possibleRoot = await this.walletLink.getRootKeyForWallet(wallet)
            if (possibleRoot !== INVALID_ADDRESS) {
                linkedWallets = await this.walletLink.getLinkedWallets(possibleRoot)
                return [possibleRoot, ...linkedWallets]
            }
        }
        return [wallet, ...linkedWallets]
    }

    private async evaluateEntitledWallet(
        rootKey: string,
        allWallets: string[],
        entitlements: EntitlementData[],
        xchainConfig: XchainConfig,
    ): Promise<EntitledWallet> {
        const isEveryOneSpace = entitlements.some((e) =>
            e.userEntitlement?.includes(EVERYONE_ADDRESS),
        )

        if (isEveryOneSpace) {
            return rootKey
        }

        // Evaluate all user entitlements first, as they do not require external calls.
        for (const entitlement of entitlements) {
            for (const user of allWallets) {
                if (entitlement.userEntitlement?.includes(user)) {
                    return user
                }
            }
        }

        // Accumulate all RuleDataV1 entitlements and convert to V2s.
        const ruleEntitlements = entitlements
            .filter(
                (x) =>
                    x.entitlementType === EntitlementModuleType.RuleEntitlement &&
                    x.ruleEntitlement?.kind == 'v1',
            )
            .map((x) =>
                convertRuleDataV1ToV2(
                    x.ruleEntitlement!.rules as IRuleEntitlementBase.RuleDataStruct,
                ),
            )

        // Add all RuleDataV2 entitlements.
        ruleEntitlements.push(
            ...entitlements
                .filter(
                    (x) =>
                        x.entitlementType === EntitlementModuleType.RuleEntitlementV2 &&
                        x.ruleEntitlement?.kind == 'v2',
                )
                .map((x) => x.ruleEntitlement!.rules as IRuleEntitlementV2Base.RuleDataV2Struct),
        )

        return await Promise.any(
            ruleEntitlements.map(async (ruleData) => {
                if (!ruleData) {
                    throw new Error('Rule data not found')
                }
                const operations = ruleDataToOperations(ruleData)

                const result = await evaluateOperationsForEntitledWallet(
                    operations,
                    allWallets,
                    xchainConfig,
                )
                if (result !== ethers.constants.AddressZero) {
                    return result
                }
                // This is not a true error, but is used here so that the Promise.any will not
                // resolve with an unentitled wallet.
                throw new NoEntitledWalletError()
            }),
        ).catch(NoEntitledWalletError.throwIfRuntimeErrors)
    }

    /**
     * Checks if user has a wallet entitled to join a space based on the minter role rule entitlements
     */
    public async getEntitledWalletForJoiningSpace(
        spaceId: string,
        rootKey: string,
        xchainConfig: XchainConfig,
    ): Promise<EntitledWallet> {
        const { value } = await this.entitledWalletCache.executeUsingCache(
            newSpaceEntitlementEvaluationRequest(spaceId, rootKey, Permission.JoinSpace),
            async (request) => {
                const entitledWallet = await this.getEntitledWalletForJoiningSpaceUncached(
                    request.spaceId,
                    request.userId,
                    xchainConfig,
                )
                return new EntitledWalletCacheResult(entitledWallet)
            },
        )
        return value
    }

    private async getEntitledWalletForJoiningSpaceUncached(
        spaceId: string,
        rootKey: string,
        xchainConfig: XchainConfig,
    ): Promise<EntitledWallet> {
        const allWallets = await this.getLinkedWallets(rootKey)

        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const owner = await space.Ownable.read.owner()

        // Space owner is entitled to all channels
        if (allWallets.includes(owner)) {
            return owner
        }

        const bannedWallets = await this.bannedWalletAddresses(spaceId)
        for (const wallet of allWallets) {
            if (bannedWallets.includes(wallet)) {
                return
            }
        }

        const entitlements = await this.getEntitlementsForPermission(spaceId, Permission.JoinSpace)
        return await this.evaluateEntitledWallet(rootKey, allWallets, entitlements, xchainConfig)
    }

    public async isEntitledToSpace(
        spaceId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const { value } = await this.entitlementEvaluationCache.executeUsingCache(
            newSpaceEntitlementEvaluationRequest(spaceId, user, permission),
            async (request) => {
                const isEntitled = await this.isEntitledToSpaceUncached(
                    request.spaceId,
                    request.userId,
                    request.permission,
                )
                return new BooleanCacheResult(isEntitled)
            },
        )
        return value
    }

    public async isEntitledToSpaceUncached(
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
        xchainConfig: XchainConfig = EmptyXchainConfig,
    ): Promise<boolean> {
        const { value } = await this.entitlementEvaluationCache.executeUsingCache(
            newChannelEntitlementEvaluationRequest(spaceId, channelNetworkId, user, permission),
            async (request) => {
                const isEntitled = await this.isEntitledToChannelUncached(
                    request.spaceId,
                    request.channelId,
                    request.userId,
                    request.permission,
                    xchainConfig,
                )
                return new BooleanCacheResult(isEntitled)
            },
        )
        return value
    }

    public async isEntitledToChannelUncached(
        spaceId: string,
        channelNetworkId: string,
        user: string,
        permission: Permission,
        xchainConfig: XchainConfig,
    ): Promise<boolean> {
        const space = this.getSpace(spaceId)
        if (!space) {
            return false
        }

        const channelId = ensureHexPrefix(channelNetworkId)

        const linkedWallets = await this.getLinkedWallets(user)

        const owner = await space.Ownable.read.owner()

        // Space owner is entitled to all channels
        if (linkedWallets.includes(owner)) {
            return true
        }

        const bannedWallets = await this.bannedWalletAddresses(spaceId)
        for (const wallet of linkedWallets) {
            if (bannedWallets.includes(wallet)) {
                return false
            }
        }

        const entitlements = await this.getChannelEntitlementsForPermission(
            spaceId,
            channelId,
            permission,
        )
        const entitledWallet = await this.evaluateEntitledWallet(
            user,
            linkedWallets,
            entitlements,
            xchainConfig,
        )
        return entitledWallet !== undefined
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
        const nonSpaceContracts = [this.pricingModules, this.walletLink]
        for (const contract of nonSpaceContracts) {
            err = contract.parseError(args.error)
            if (err?.name !== UNKNOWN_ERROR) {
                return err
            }
        }
        return err
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
        const channelId = ensureHexPrefix(params.channelId)

        if (isUpdateChannelStatusParams(params)) {
            // When enabling or disabling channels, passing names and roles is not required.
            // To ensure the contract accepts this exception, the metadata argument should be left empty.
            return [
                space.Channels.interface.encodeFunctionData('updateChannel', [channelId, '', true]),
            ]
        }

        // data for the multicall
        const encodedCallData: BytesLike[] = []

        // update the channel metadata
        encodedCallData.push(
            space.Channels.interface.encodeFunctionData('updateChannel', [
                channelId,
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

    public async removeChannel(
        params: RemoveChannelParams,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(params.spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceId}" is not found.`)
        }
        return wrapTransaction(
            () => space.Channels.write(signer).removeChannel(params.channelId),
            txnOpts,
        )
    }

    public async legacyUpdateRole(
        params: LegacyUpdateRoleParams,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(params.spaceNetworkId)
        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceNetworkId}" is not found.`)
        }
        const updatedEntitlemets = await this.createLegacyUpdatedEntitlements(space, params)
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

    public async getChannelPermissionOverrides(
        spaceId: string,
        roleId: number,
        channelNetworkId: string,
    ): Promise<Permission[]> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const channelId = ensureHexPrefix(channelNetworkId)
        return (await space.Roles.read.getChannelPermissionOverrides(roleId, channelId)).filter(
            isPermission,
        )
    }

    public async setChannelPermissionOverrides(
        params: SetChannelPermissionOverridesParams,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(params.spaceNetworkId)
        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceNetworkId}" is not found.`)
        }
        const channelId = ensureHexPrefix(params.channelId)

        return wrapTransaction(
            () =>
                space.Roles.write(signer).setChannelPermissionOverrides(
                    params.roleId,
                    channelId,
                    params.permissions,
                ),
            txnOpts,
        )
    }

    public async clearChannelPermissionOverrides(
        params: ClearChannelPermissionOverridesParams,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(params.spaceNetworkId)
        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceNetworkId}" is not found.`)
        }
        const channelId = ensureHexPrefix(params.channelId)

        return wrapTransaction(
            () =>
                space.Roles.write(signer).clearChannelPermissionOverrides(params.roleId, channelId),
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
        const cost = await space.Prepay.read.calculateMembershipPrepayFee(supply)

        return wrapTransaction(
            () =>
                space.Prepay.write(signer).prepayMembership(supply, {
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
        return space.Prepay.read.prepaidMembershipSupply()
    }

    public async setChannelAccess(
        spaceId: string,
        channelNetworkId: string,
        disabled: boolean,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const channelId = ensureHexPrefix(channelNetworkId)
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

    public async getJoinSpacePriceDetails(spaceId: string): Promise<{
        price: ethers.BigNumber
        prepaidSupply: ethers.BigNumber
        remainingFreeSupply: ethers.BigNumber
    }> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        // membershipPrice is either the maximum of either the price set during space creation, or the PlatformRequirements membership fee
        // it will alawys be a value regardless of whether the space has free allocations or prepaid memberships
        const membershipPrice = await space.Membership.read.getMembershipPrice()
        // totalSupply = number of memberships minted
        const totalSupply = await space.ERC721A.read.totalSupply()
        // free allocation is set at space creation and is unchanging - it neither increases nor decreases
        // if totalSupply < freeAllocation, the contracts won't charge for minting a membership nft,
        // else it will charge the membershipPrice
        const freeAllocation = await this.getMembershipFreeAllocation(spaceId)
        // prepaidSupply = number of additional prepaid memberships
        // if any prepaid memberships have been purchased, the contracts won't charge for minting a membership nft,
        // else it will charge the membershipPrice
        const prepaidSupply = await space.Prepay.read.prepaidMembershipSupply()
        // remainingFreeSupply
        // if totalSupply < freeAllocation, freeAllocation + prepaid - minted memberships
        // else the remaining prepaidSupply if any
        const remainingFreeSupply = totalSupply.lt(freeAllocation)
            ? freeAllocation.add(prepaidSupply).sub(totalSupply)
            : prepaidSupply

        return {
            price: remainingFreeSupply.gt(0) ? ethers.BigNumber.from(0) : membershipPrice,
            prepaidSupply,
            remainingFreeSupply,
        }
    }

    public async getMembershipFreeAllocation(spaceId: string) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.Membership.read.getMembershipFreeAllocation()
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
        const { price } = await this.getJoinSpacePriceDetails(spaceId)
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
        const totalSupply = await space.ERC721A.read.totalSupply()

        return { totalSupply: totalSupply.toNumber() }
    }

    public async getMembershipInfo(spaceId: string) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const [
            joinSpacePriceDetails,
            limit,
            currency,
            feeRecipient,
            duration,
            totalSupply,
            pricingModule,
        ] = await Promise.all([
            this.getJoinSpacePriceDetails(spaceId),
            space.Membership.read.getMembershipLimit(),
            space.Membership.read.getMembershipCurrency(),
            space.Ownable.read.owner(),
            space.Membership.read.getMembershipDuration(),
            space.ERC721A.read.totalSupply(),
            space.Membership.read.getMembershipPricingModule(),
        ])
        const { price, prepaidSupply, remainingFreeSupply } = joinSpacePriceDetails

        return {
            price, // keep as BigNumber (wei)
            maxSupply: limit.toNumber(),
            currency: currency,
            feeRecipient: feeRecipient,
            duration: duration.toNumber(),
            totalSupply: totalSupply.toNumber(),
            pricingModule: pricingModule,
            prepaidSupply: prepaidSupply.toNumber(),
            remainingFreeSupply: remainingFreeSupply.toNumber(),
        } satisfies MembershipInfo
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
        const channelId = ensureHexPrefix(channelNetworkId)
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
        const channelId = ensureHexPrefix(channelNetworkId)
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
        const channelId = ensureHexPrefix(channelNetworkId)
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

    public async createLegacyUpdatedEntitlements(
        space: Space,
        params: LegacyUpdateRoleParams,
    ): Promise<IRolesBase.CreateEntitlementStruct[]> {
        return createLegacyEntitlementStruct(space, params.users, params.ruleData)
    }

    public async createUpdatedEntitlements(
        space: Space,
        params: UpdateRoleParams,
    ): Promise<IRolesBase.CreateEntitlementStruct[]> {
        return createEntitlementStruct(space, params.users, params.ruleData)
    }

    public async refreshMetadata(
        spaceId: string,
        signer: ethers.Signer,
        txnOpts?: TransactionOpts,
    ): Promise<ContractTransaction> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return wrapTransaction(
            () => space.Membership.metadata.write(signer).refreshMetadata(),
            txnOpts,
        )
    }

    /**
     * Get the space address from the receipt and sender address
     * @param receipt - The receipt from the transaction
     * @param senderAddress - The address of the sender. Required for the case of a receipt containing multiple events of the same type.
     * @returns The space address or undefined if the receipt is not successful
     */
    public getSpaceAddress(receipt: ContractReceipt, senderAddress: string): string | undefined {
        if (receipt.status !== 1) {
            return undefined
        }
        for (const receiptLog of receipt.logs) {
            const spaceAddress = this.spaceRegistrar.SpaceArchitect.getSpaceAddressFromLog(
                receiptLog,
                senderAddress,
            )
            if (spaceAddress) {
                return spaceAddress
            }
        }
        return undefined
    }

    public getTipEvent(
        spaceId: string,
        receipt: ContractReceipt,
        senderAddress: string,
    ): TipEventObject | undefined {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.Tipping.getTipEvent(receipt, senderAddress)
    }

    public withdrawSpaceFunds(spaceId: string, recipient: string, signer: ethers.Signer) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.Membership.write(signer).withdraw(recipient)
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

    /**
     * Get the token id for the owner
     * Returns the first token id matched from the linked wallets of the owner
     * @param spaceId - The space id
     * @param owner - The owner
     * @returns The token id
     */
    public async getTokenIdOfOwner(spaceId: string, owner: string): Promise<string | undefined> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const linkedWallets = await this.getLinkedWallets(owner)
        const tokenIds = await space.getTokenIdsOfOwner(linkedWallets)
        return tokenIds[0]
    }

    /**
     * Tip a user
     * @param args
     * @param args.spaceId - The space id
     * @param args.tokenId - The token id to tip. Obtainable from getTokenIdOfOwner
     * @param args.currency - The currency to tip - address or 0xEeeeeeeeee... for native currency
     * @param args.amount - The amount to tip
     * @param args.messageId - The message id - needs to be hex encoded to 64 characters
     * @param args.channelId - The channel id - needs to be hex encoded to 64 characters
     * @param signer - The signer to use for the tip
     * @returns The transaction
     */
    public async tip(
        args: {
            spaceId: string
            tokenId: string
            currency: string
            amount: bigint
            messageId: string
            channelId: string
            receiver: string
        },
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const { spaceId, tokenId, currency, amount, messageId, channelId, receiver } = args
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        return space.Tipping.write(signer).tip(
            {
                receiver,
                tokenId,
                currency,
                amount,
                messageId: ensureHexPrefix(messageId),
                channelId: ensureHexPrefix(channelId),
            },
            {
                value: amount,
            },
        )
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
    const retryLimit = txnOpts?.retryCount ?? isTestEnv() ? 3 : 0

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
