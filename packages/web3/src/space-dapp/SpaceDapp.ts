import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    ClearChannelPermissionOverridesParams,
    CreateLegacySpaceParams,
    CreateSpaceParams,
    EntitlementModuleType,
    isPermission,
    isUpdateChannelStatusParams,
    LegacyUpdateRoleParams,
    MembershipInfo,
    Permission,
    PricingModuleStruct,
    RemoveChannelParams,
    RoleDetails,
    SendTipParams,
    SetChannelPermissionOverridesParams,
    TransactionOpts,
    UpdateChannelParams,
    UpdateRoleParams,
    VersionedRuleData,
    type Address,
} from '../types/ContractTypes'
import { SpaceInfo } from '../types/types'

import { computeDelegatorsForProvider } from '../delegate-registry/DelegateRegistry'
import { BigNumber, BytesLike, ContractReceipt, ContractTransaction, ethers } from 'ethers'
import { LOCALHOST_CHAIN_ID } from '../utils/Web3Constants'
import {
    EVERYONE_ADDRESS,
    stringifyChannelMetadataJSON,
    NoEntitledWalletError,
    ETH_ADDRESS,
} from '../utils/ut'
import { IRolesBase } from '../space/IRolesShim'
import { Space } from '../space/Space'
import { SpaceRegistrar } from '../space-registrar/SpaceRegistrar'
import {
    XchainConfig,
    evaluateOperationsForEntitledWallet,
    ruleDataToOperations,
    findEthereumProviders,
} from '../space/entitlements/entitlement'

import {
    IRuleEntitlementBase,
    RuleEntitlementShim,
} from '../space/entitlements/RuleEntitlementShim'
import {
    createEntitlementStruct,
    createLegacyEntitlementStruct,
    convertRuleDataV1ToV2,
} from '../space/entitlements/ConvertersEntitlements'
import {
    IRuleEntitlementV2Base,
    RuleEntitlementV2Shim,
} from '../space/entitlements/RuleEntitlementV2Shim'
import { UserEntitlementShim } from '../space/entitlements/UserEntitlementShim'

import { RiverAirdropDapp } from '../airdrop/RiverAirdropDapp'
import { BaseChainConfig } from '../utils/web3Env'
import { WalletLink, INVALID_ADDRESS } from '../wallet-link/WalletLink'
import { OverrideExecution, UNKNOWN_ERROR } from '../BaseContractShim'
import { PricingModules } from '../pricing-modules/PricingModules'
import { dlogger, isTestEnv } from '@towns-protocol/utils'

import { PlatformRequirements } from '../platform-requirements/PlatformRequirements'
import { EntitlementDataStructOutput } from '../space/IEntitlementDataQueryableShim'
import { CacheResult, EntitlementCache } from '../cache/EntitlementCache'
import { SimpleCache } from '../cache/SimpleCache'
import { TipSentEventObject, ITippingShim } from '../space/ITippingShim'
import { CreateStorageFn } from '../cache/ICacheStorage'
import { SpaceOwner } from '../space-owner/SpaceOwner'
import { TownsToken } from '../towns-token/TownsToken'
import { wrapTransaction } from '../space-dapp/wrapTransaction'
import { BaseRegistry } from '../base-registry/BaseRegistry'
import { Keyable } from '../cache/Keyable'

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

function ensureHexPrefix(value: string): string {
    return value.startsWith('0x') ? value : `0x${value}`
}

const EmptyXchainConfig: XchainConfig = {
    supportedRpcUrls: {},
    etherNativeNetworkIds: [],
    ethereumNetworkIds: [],
}

type EntitledWallet = string | undefined

/**
 * Factory function type for creating cache storage
 * The function receives config (ttlMs, maxSize, keyPrefix) and returns a storage instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SpaceDappCreateStorageFn = CreateStorageFn<any>

export class SpaceDapp<TProvider extends ethers.providers.Provider = ethers.providers.Provider> {
    private isLegacySpaceCache: Map<string, boolean>
    public readonly config: BaseChainConfig
    public readonly baseRegistry: BaseRegistry
    public readonly provider: TProvider
    public readonly spaceRegistrar: SpaceRegistrar
    public readonly pricingModules: PricingModules
    public readonly walletLink: WalletLink
    public readonly platformRequirements: PlatformRequirements
    public readonly airdrop: RiverAirdropDapp
    public readonly spaceOwner: SpaceOwner
    public readonly townsToken?: TownsToken

    public readonly entitlementCache: EntitlementCache<EntitlementData[]>
    public readonly entitledWalletCache: EntitlementCache<EntitledWallet>
    public readonly entitlementEvaluationCache: EntitlementCache<boolean>
    public readonly bannedTokenIdsCache: SimpleCache<ethers.BigNumber[]>
    public readonly ownerOfTokenCache: SimpleCache<string>
    public readonly isBannedTokenCache: SimpleCache<boolean>

    constructor(
        config: BaseChainConfig,
        provider: TProvider,
        createStorageFn?: SpaceDappCreateStorageFn,
    ) {
        this.isLegacySpaceCache = new Map()
        this.config = config
        this.provider = provider
        this.baseRegistry = new BaseRegistry(config, provider)
        this.spaceRegistrar = new SpaceRegistrar(config, provider, createStorageFn)
        this.walletLink = new WalletLink(config, provider)
        this.pricingModules = new PricingModules(config, provider)
        this.platformRequirements = new PlatformRequirements(
            config.addresses.spaceFactory,
            provider,
        )
        this.spaceOwner = new SpaceOwner(config.addresses.spaceOwner, provider, createStorageFn)
        if (config.addresses.utils.towns) {
            this.townsToken = new TownsToken(
                config.addresses.utils.towns,
                provider,
                createStorageFn,
            )
        }
        this.airdrop = new RiverAirdropDapp(config, provider)

        // For RPC providers that pool for events, we need to set the polling interval to a lower value
        // so that we don't miss events that may be emitted in between polling intervals. The Ethers
        // default is 4000ms, which is based on the assumption of 12s mainnet blocktimes.
        if ('pollingInterval' in provider && typeof provider.pollingInterval === 'number') {
            provider.pollingInterval = 250
        }

        const isLocalDev = isTestEnv() || config.chainId === LOCALHOST_CHAIN_ID
        const entitlementCacheOpts = {
            positiveCacheTTLSeconds: isLocalDev ? 5 : 15 * 60,
            negativeCacheTTLSeconds: 2,
            createStorageFn,
        }
        const bannedCacheOpts = {
            ttlSeconds: isLocalDev ? 5 : 15 * 60,
            createStorageFn,
        }

        // The caching of positive entitlements is shorter on both the node and client.
        this.entitlementCache = new EntitlementCache({
            positiveCacheTTLSeconds: isLocalDev ? 5 : 15,
            negativeCacheTTLSeconds: 2,
            createStorageFn,
        })
        this.entitledWalletCache = new EntitlementCache({
            ...entitlementCacheOpts,
        })
        this.entitlementEvaluationCache = new EntitlementCache({
            ...entitlementCacheOpts,
        })
        this.bannedTokenIdsCache = new SimpleCache({
            ...bannedCacheOpts,
        })
        this.ownerOfTokenCache = new SimpleCache({
            ...bannedCacheOpts,
        })
        this.isBannedTokenCache = new SimpleCache({
            ...bannedCacheOpts,
        })
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
            .then((tokens) => tokens.at(0))

        if (!token) {
            throw new Error(
                `Wallet address "${walletAddress}" is not a member of space "${spaceId}".`,
            )
        }

        // Call ban
        const tx = await wrapTransaction(() => space.Banning.write(signer).ban(token), txnOpts)
        await this.updateCacheAfterBanOrUnBan(spaceId, token)
        return tx
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
            .then((tokens) => tokens.at(0))

        if (!token) {
            throw new Error(
                `Wallet address "${walletAddress}" is not a member of space "${spaceId}".`,
            )
        }

        // Call unban
        const tx = await wrapTransaction(() => space.Banning.write(signer).unban(token), txnOpts)
        await this.updateCacheAfterBanOrUnBan(spaceId, token)
        return tx
    }

    public async updateCacheAfterBanOrUnBan(spaceId: string, tokenId: ethers.BigNumber) {
        await Promise.all([
            this.bannedTokenIdsCache.remove(Keyable.bannedTokenIds(spaceId)),
            this.ownerOfTokenCache.remove(Keyable.ownerOfToken(spaceId, tokenId)),
            this.isBannedTokenCache.remove(Keyable.isTokenBanned(spaceId, tokenId)),
        ])
    }

    public async walletAddressIsBanned(
        spaceId: string,
        walletAddress: string,
        opts?: { skipCache?: boolean },
    ): Promise<boolean> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const tokenId = await space.ERC721AQueryable.read
            .tokensOfOwner(walletAddress)
            .then((tokens) => tokens.at(0))

        if (!tokenId) {
            return false
        }

        const isBanned = await this.isBannedTokenCache.executeUsingCache(
            Keyable.isTokenBanned(spaceId, tokenId),
            async () => space.Banning.read.isBanned(tokenId),
            opts,
        )
        return isBanned
    }

    public async bannedWalletAddresses(spaceId: string): Promise<string[]> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        // 1. Get banned token IDs
        const bannedTokenIds = await this.bannedTokenIdsCache.executeUsingCache(
            Keyable.bannedTokenIds(spaceId),
            async () => {
                const currentSpace = this.getSpace(spaceId)
                if (!currentSpace) {
                    throw new Error(
                        `Space with spaceId "${spaceId}" is not found inside cache fetch.`,
                    )
                }
                return currentSpace.Banning.read.banned()
            },
        )

        // 2. Get owner for each banned token ID using cache and multicall for efficiency
        const ownerMap = new Map<string, string>() // tokenId.toString() -> ownerAddress
        const tokenIdsToFetch: ethers.BigNumber[] = []

        // Check cache first - parallel lookups for remote storage efficiency
        const cacheResults = await Promise.all(
            bannedTokenIds.map(async (tokenId) => {
                const cacheKey = Keyable.ownerOfToken(spaceId, tokenId)
                const cachedOwner = await this.ownerOfTokenCache.get(cacheKey)
                return { tokenId, cachedOwner }
            }),
        )

        for (const { tokenId, cachedOwner } of cacheResults) {
            if (cachedOwner) {
                ownerMap.set(tokenId.toString(), cachedOwner)
            } else {
                tokenIdsToFetch.push(tokenId)
            }
        }

        // Fetch non-cached owners
        if (tokenIdsToFetch.length > 0 && space) {
            const calls = tokenIdsToFetch.map((tokenId) =>
                space.ERC721A.interface.encodeFunctionData('ownerOf', [tokenId]),
            )

            try {
                const results = await space.Multicall.read.callStatic.multicall(calls)
                const cacheWritePromises: Promise<void>[] = []

                for (const [index, resultData] of results.entries()) {
                    const tokenId = tokenIdsToFetch[index]
                    // Attempt to decode each result
                    try {
                        if (resultData && resultData !== '0x') {
                            const ownerAddress = space.ERC721A.interface.decodeFunctionResult(
                                'ownerOf',
                                resultData,
                            )[0] as string

                            if (ethers.utils.isAddress(ownerAddress)) {
                                ownerMap.set(tokenId.toString(), ownerAddress)
                                // Collect cache write promises for parallel execution
                                cacheWritePromises.push(
                                    this.ownerOfTokenCache.add(
                                        Keyable.ownerOfToken(spaceId, tokenId),
                                        ownerAddress,
                                    ),
                                )
                            } else {
                                logger.log(
                                    `bannedWalletAddresses: Multicall: Decoded ownerOf result is not a valid address for token ${tokenId.toString()} in space ${spaceId}: ${ownerAddress}`,
                                )
                            }
                        } else {
                            logger.log(
                                `bannedWalletAddresses: Multicall: ownerOf call returned empty data for token ${tokenId.toString()} in space ${spaceId}`,
                            )
                        }
                    } catch (decodeError) {
                        logger.error(
                            `bannedWalletAddresses: Multicall: Failed to decode ownerOf result for token ${tokenId.toString()} in space ${spaceId}`,
                            decodeError instanceof Error
                                ? decodeError.message
                                : String(decodeError),
                        )
                    }
                }

                // Write all cache entries in parallel
                await Promise.all(cacheWritePromises)
            } catch (multiCallError) {
                logger.error(
                    `Multicall execution failed for space ${spaceId}. This likely means one of the ownerOf calls reverted.`,
                    multiCallError instanceof Error
                        ? multiCallError.message
                        : String(multiCallError),
                )
            }
        }

        // Return the unique owner addresses combined from cache and multicall
        return Array.from(new Set(ownerMap.values()))
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
                'createSpace((string,string,string,string,((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],bytes,bool),string[]),(string)))'
            ] as (arg: any) => Promise<ContractTransaction>

            return createSpaceFunction({
                name: params.spaceName,
                uri: params.uri,
                shortDescription: params.shortDescription || '',
                longDescription: params.longDescription || '',
                membership: params.membership,
                channel: {
                    metadata: params.channelName || '',
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
            space.Ownable.getOwner(),
            space.Pausable.read.paused(),
            this.spaceOwner.getSpaceInfo(space.Address),
        ])
        return {
            address: space.Address,
            networkId: space.SpaceId,
            name: spaceInfo.name ?? '',
            owner,
            disabled,
            uri: spaceInfo.uri ?? '',
            tokenId: ethers.BigNumber.from(spaceInfo.tokenId).toString(),
            createdAt: ethers.BigNumber.from(spaceInfo.createdAt).toString(),
            shortDescription: spaceInfo.shortDescription ?? '',
            longDescription: spaceInfo.longDescription ?? '',
        }
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
                if (ruleEntitlementShim)
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
            Keyable.spaceEntitlement(spaceId, permission),
            async () => {
                const entitlementData = await this.getEntitlementsForPermissionUncached(
                    spaceId,
                    permission,
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
            Keyable.channelEntitlement(spaceId, channelId, permission),
            async () => {
                const entitlementData = await this.getChannelEntitlementsForPermissionUncached(
                    spaceId,
                    channelId,
                    permission,
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

    public async getLinkedWallets(wallet: string): Promise<Address[]> {
        let linkedWallets = await this.walletLink.getLinkedWallets(wallet)
        // If there are no linked wallets, consider that the wallet may be linked to another root key.
        if (linkedWallets.length === 0) {
            const possibleRoot = await this.walletLink.getRootKeyForWallet(wallet)
            if (possibleRoot !== INVALID_ADDRESS) {
                linkedWallets = await this.walletLink.getLinkedWallets(possibleRoot)
                return [possibleRoot as Address, ...(linkedWallets as Address[])]
            }
        }
        return [wallet as Address, ...(linkedWallets as Address[])]
    }

    private async getMainnetDelegationsForLinkedWallets(
        linkedWallets: string[],
        config: XchainConfig,
    ): Promise<Set<string>> {
        const delegatorSet: Set<string> = new Set()
        const ethProviders = await findEthereumProviders(config)

        for (const provider of ethProviders) {
            const delegators = await computeDelegatorsForProvider(provider, linkedWallets)
            for (const delegator of delegators) {
                delegatorSet.add(delegator)
            }
        }
        return delegatorSet
    }

    public async getLinkedWalletsWithDelegations(
        wallet: string,
        config: XchainConfig,
    ): Promise<string[]> {
        const linkedWallets = await this.getLinkedWallets(wallet)
        const allWallets = new Set(linkedWallets)
        const delegators = await this.getMainnetDelegationsForLinkedWallets(linkedWallets, config)
        return [...new Set([...allWallets, ...delegators])]
    }

    private async evaluateEntitledWallet(
        space: Space,
        rootKey: string,
        allWallets: string[],
        entitlements: EntitlementData[],
        xchainConfig: XchainConfig,
    ): Promise<EntitledWallet> {
        const { isExpired } = await space.getMembershipStatus(allWallets)

        // otherwise you're trying to do something with an expired membership
        if (isExpired) {
            return
        }

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
        skipCache: boolean = false,
    ): Promise<EntitledWallet> {
        const key = Keyable.spaceEntitlementEvaluation(spaceId, rootKey, Permission.JoinSpace)
        const { value } = await this.entitledWalletCache.executeUsingCache(
            key,
            async () => {
                const entitledWallet = await this.getEntitledWalletForJoiningSpaceUncached(
                    spaceId,
                    rootKey,
                    xchainConfig,
                )
                return new EntitledWalletCacheResult(entitledWallet)
            },
            { skipCache },
        )
        return value
    }

    private async getEntitledWalletForJoiningSpaceUncached(
        spaceId: string,
        rootKey: string,
        xchainConfig: XchainConfig,
    ): Promise<EntitledWallet> {
        const allWallets = await this.getLinkedWalletsWithDelegations(rootKey, xchainConfig)

        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const owner = await space.Ownable.getOwner()

        // Space owner is entitled to all channels
        if (allWallets.includes(owner)) {
            return owner
        }

        const promises = allWallets.map(async (wallet) =>
            this.walletAddressIsBanned(spaceId, wallet).then((r) =>
                r === true ? true : Promise.reject(new Error('Wallet is not banned')),
            ),
        )

        try {
            // If any promise resolves (meaning a wallet IS banned), this succeeds.
            await Promise.any(promises)
            return
        } catch (error) {
            // all promises rejected, meaning no wallets are banned
        }

        const entitlements = await this.getEntitlementsForPermission(spaceId, Permission.JoinSpace)
        return await this.evaluateEntitledWallet(
            space,
            rootKey,
            allWallets,
            entitlements,
            xchainConfig,
        )
    }

    public async isEntitledToSpace(
        spaceId: string,
        userId: string,
        permission: Permission,
        skipCache: boolean = false,
    ): Promise<boolean> {
        const key = Keyable.spaceEntitlementEvaluation(spaceId, userId, permission)
        const { value } = await this.entitlementEvaluationCache.executeUsingCache(
            key,
            async () => {
                const isEntitled = await this.isEntitledToSpaceUncached(spaceId, userId, permission)
                return new BooleanCacheResult(isEntitled)
            },
            { skipCache },
        )
        return value
    }

    public async isAppInstalled(spaceId: string, botAppAddress: string): Promise<boolean> {
        const space = this.getSpace(spaceId)
        if (!space) {
            return false
        }
        return space.AppAccount.read.isAppInstalled(botAppAddress)
    }

    public async isAppEntitled(
        spaceId: string,
        botId: string,
        botAppAddress: string,
        permission: Permission,
    ): Promise<boolean> {
        const space = this.getSpace(spaceId)
        if (!space) {
            return false
        }
        const permissionBytes = ethers.utils.formatBytes32String(permission)
        return space.AppAccount.read.isAppEntitled(botAppAddress, botId, permissionBytes)
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
        userId: string,
        permission: Permission,
        xchainConfig: XchainConfig = EmptyXchainConfig,
        skipCache: boolean = false,
    ): Promise<boolean> {
        const key = Keyable.channelEntitlementEvaluation(
            spaceId,
            channelNetworkId,
            userId,
            permission,
        )
        const { value } = await this.entitlementEvaluationCache.executeUsingCache(
            key,
            async () => {
                const isEntitled = await this.isEntitledToChannelUncached(
                    spaceId,
                    channelNetworkId,
                    userId,
                    permission,
                    xchainConfig,
                )
                return new BooleanCacheResult(isEntitled)
            },
            { skipCache },
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

        const linkedWallets = await this.getLinkedWalletsWithDelegations(user, xchainConfig)

        const owner = await space.Ownable.getOwner()

        // Space owner is entitled to all channels
        if (linkedWallets.includes(owner)) {
            return true
        }

        const promises = linkedWallets.map(async (wallet) =>
            this.walletAddressIsBanned(spaceId, wallet).then((r) =>
                r === true ? true : Promise.reject(new Error('Wallet is not banned')),
            ),
        )

        try {
            // If any promise resolves (meaning a wallet IS banned), this succeeds.
            await Promise.any(promises)
            return false
        } catch (error) {
            // all promises rejected, meaning no wallets are banned
        }

        const entitlements = await this.getChannelEntitlementsForPermission(
            spaceId,
            channelId,
            permission,
        )
        const entitledWallet = await this.evaluateEntitledWallet(
            space,
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

    public parseSpaceOwnerError(error: unknown): Error {
        if (!this.spaceOwner) {
            throw new Error('SpaceOwner is not deployed properly.')
        }
        const decodedErr = this.spaceOwner.parseError(error)
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
        const nonSpaceContracts = [this.airdrop.riverPoints, this.pricingModules, this.walletLink]
        for (const contract of nonSpaceContracts) {
            if (!contract) {
                continue
            }
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
        remainingFreeSupply: ethers.BigNumber
        protocolFee: ethers.BigNumber
    }> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        // membershipPrice is either the maximum of either the price set during space creation, or the PlatformRequirements membership fee
        // it will always be a value regardless of whether the space has free allocations
        const membershipPriceEncoded =
            space.Membership.interface.encodeFunctionData('getMembershipPrice')
        // totalSupply = number of memberships minted
        const totalSupplyEncoded = space.ERC721A.interface.encodeFunctionData('totalSupply')
        // free allocation is set at space creation and is unchanging - it neither increases nor decreases
        // if totalSupply < freeAllocation, the contracts won't charge for minting a membership nft,
        // else it will charge the membershipPrice
        const freeAllocationEncoded = space.Membership.interface.encodeFunctionData(
            'getMembershipFreeAllocation',
        )

        const protocolFeeEncoded = space.Membership.interface.encodeFunctionData('getProtocolFee')

        const [membershipPriceResult, totalSupplyResult, freeAllocationResult, protocolFeeResult] =
            await space.Multicall.read.callStatic.multicall([
                membershipPriceEncoded,
                totalSupplyEncoded,
                freeAllocationEncoded,
                protocolFeeEncoded,
            ])

        try {
            const membershipPrice = space.Membership.interface.decodeFunctionResult(
                'getMembershipPrice',
                membershipPriceResult,
            )[0] as BigNumber
            const totalSupply = space.ERC721A.interface.decodeFunctionResult(
                'totalSupply',
                totalSupplyResult,
            )[0] as BigNumber
            const freeAllocation = space.Membership.interface.decodeFunctionResult(
                'getMembershipFreeAllocation',
                freeAllocationResult,
            )[0] as BigNumber
            const protocolFee = space.Membership.interface.decodeFunctionResult(
                'getProtocolFee',
                protocolFeeResult,
            )[0] as BigNumber
            // remainingFreeSupply = freeAllocation - totalSupply (if positive)
            const remainingFreeSupply = totalSupply.lt(freeAllocation)
                ? freeAllocation.sub(totalSupply)
                : ethers.BigNumber.from(0)

            return {
                price: remainingFreeSupply.gt(0) ? ethers.BigNumber.from(0) : membershipPrice,
                remainingFreeSupply,
                protocolFee,
            }
        } catch (error) {
            logger.error('getJoinSpacePriceDetails: Error decoding membership price', error)
            throw error
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

        const [spaceCurrency, { price }] = await Promise.all([
            space.Membership.read.getMembershipCurrency(),
            this.getJoinSpacePriceDetails(spaceId),
        ])

        const blockNumber = await space.provider?.getBlockNumber()
        const startIssuedListener = space.Membership.listenForMembershipToken({
            receiver: recipient,
            startingBlock: blockNumber,
        })

        logger.log('joinSpace before blockNumber', Date.now() - getSpaceStart, blockNumber)
        const getPriceStart = Date.now()
        logger.log('joinSpace getMembershipPrice', Date.now() - getPriceStart)
        const wrapStart = Date.now()
        const issuedListener = startIssuedListener()

        const result = await wrapTransaction(async () => {
            // Set gas limit instead of using estimateGas
            // As the estimateGas is not reliable for this contract
            return await space.Membership.write(signer)['joinSpace(address)'](recipient, {
                gasLimit: 1_500_000,
                value: spaceCurrency.toLowerCase() === ETH_ADDRESS.toLowerCase() ? price : 0,
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

    public async hasSpaceMembership(spaceId: string, addresses: string[]): Promise<boolean> {
        const membershipStatus = await this.getMembershipStatus(spaceId, addresses)
        return membershipStatus.isMember && !membershipStatus.isExpired
    }

    public async getMembershipStatus(spaceId: string, addresses: string[]) {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        return space.getMembershipStatus(addresses)
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
            space.Ownable.getOwner(),
            space.Membership.read.getMembershipDuration(),
            space.ERC721A.read.totalSupply(),
            space.Membership.read.getMembershipPricingModule(),
        ])
        const { price, remainingFreeSupply } = joinSpacePriceDetails

        return {
            price, // keep as BigNumber (wei)
            maxSupply: limit.toNumber(),
            currency: currency,
            feeRecipient: feeRecipient,
            duration: duration.toNumber(),
            totalSupply: totalSupply.toNumber(),
            pricingModule: pricingModule,
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
    ): TipSentEventObject | undefined {
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
        return space.Treasury.write(signer).withdraw(ETH_ADDRESS, recipient)
    }

    /**
     * Get the token id for the owner
     * Returns the first token id matched from the linked wallets of the owner
     * @param spaceId - The space id
     * @param owner - The owner
     * @returns The token id
     */
    public async getTokenIdOfOwner(
        spaceId: string,
        owner: string,
        config: XchainConfig = EmptyXchainConfig,
    ): Promise<string | undefined> {
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const linkedWallets = await this.getLinkedWalletsWithDelegations(owner, config)
        const tokenIds = await space.getTokenIdsOfOwner(linkedWallets)
        return tokenIds[0]
    }

    /**
     * Send a tip using the new sendTip interface
     * @param args.tipParams - The tip parameters (SendTipParams)
     * @param args.signer - The signer to use for the tip
     * @param args.txnOpts - Optional transaction options
     * @param args.overrideExecution - Optional execution override
     * @returns The transaction
     */
    public async sendTip<T = ContractTransaction>(args: {
        tipParams: SendTipParams
        signer: ethers.Signer
        txnOpts?: TransactionOpts
        overrideExecution?: OverrideExecution<T>
    }) {
        const { tipParams, signer, txnOpts, overrideExecution } = args

        let recipientType: number
        let encodedData: string
        let tippingContract: ITippingShim

        switch (tipParams.type) {
            case 'member': {
                // TipRecipientType.Member = 0
                recipientType = 0
                const { spaceId, receiver, tokenId, currency, amount, messageId, channelId } =
                    tipParams
                const space = this.getSpace(spaceId)
                if (!space) {
                    throw new Error(`Space with spaceId "${spaceId}" is not found.`)
                }
                tippingContract = space.Tipping
                const metadataData = ethers.utils.defaultAbiCoder.encode(
                    ['bytes32', 'bytes32', 'uint256'],
                    [ensureHexPrefix(messageId), ensureHexPrefix(channelId), tokenId],
                )
                // Encode struct MembershipTipParams
                encodedData = ethers.utils.defaultAbiCoder.encode(
                    [
                        'tuple(address receiver, uint256 tokenId, address currency, uint256 amount, tuple(bytes32 messageId, bytes32 channelId, bytes data) metadata)',
                    ],
                    [
                        [
                            receiver,
                            tokenId,
                            currency,
                            amount,
                            [ensureHexPrefix(messageId), ensureHexPrefix(channelId), metadataData],
                        ],
                    ],
                )
                break
            }
            case 'bot': {
                // TipRecipientType.Bot = 1
                recipientType = 1
                const { spaceId, receiver, appId, currency, amount, messageId, channelId } =
                    tipParams
                if (spaceId) {
                    const space = this.getSpace(spaceId)
                    if (!space) {
                        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
                    }
                    tippingContract = space.Tipping
                } else {
                    if (!this.config.addresses.accountModules) {
                        throw new Error('AccountModules address is not configured')
                    }
                    tippingContract = new ITippingShim(
                        this.config.addresses.accountModules,
                        this.provider,
                    )
                }
                const metadataData = ethers.utils.defaultAbiCoder.encode(
                    ['bytes32', 'bytes32'],
                    [ensureHexPrefix(messageId), ensureHexPrefix(channelId)],
                )
                // Encode struct BotTipParams
                encodedData = ethers.utils.defaultAbiCoder.encode(
                    [
                        'tuple(address receiver, address currency, bytes32 appId, uint256 amount, tuple(bytes32 messageId, bytes32 channelId, bytes data) metadata)',
                    ],
                    [
                        [
                            receiver,
                            currency,
                            ensureHexPrefix(appId),
                            amount,
                            [ensureHexPrefix(messageId), ensureHexPrefix(channelId), metadataData],
                        ],
                    ],
                )
                break
            }
            // DM tips (type: 'any') - calls the AccountModules contract directly
            case 'any': {
                // TipRecipientType.Any = 2
                recipientType = 2
                const {
                    receiver,
                    currency,
                    amount,
                    messageId,
                    channelId,
                    sender: senderOverride,
                } = tipParams
                const sender = senderOverride ?? (await signer.getAddress())
                if (!this.config.addresses.accountModules) {
                    throw new Error('AccountModules address is not configured')
                }
                tippingContract = new ITippingShim(
                    this.config.addresses.accountModules,
                    this.provider,
                )
                // Encode messageId and channelId into bytes data
                const data = ethers.utils.defaultAbiCoder.encode(
                    ['bytes32', 'bytes32'],
                    [ensureHexPrefix(messageId), ensureHexPrefix(channelId)],
                )
                // Encode struct AnyTipParams
                encodedData = ethers.utils.defaultAbiCoder.encode(
                    [
                        'tuple(address currency, address sender, address receiver, uint256 amount, bytes data)',
                    ],
                    [[currency, sender, receiver, amount, data]],
                )
                break
            }
        }

        return tippingContract.executeCall({
            signer,
            functionName: 'sendTip',
            args: [recipientType, encodedData],
            value:
                tipParams.currency.toLowerCase() === ETH_ADDRESS.toLowerCase()
                    ? tipParams.amount
                    : undefined,
            overrideExecution,
            transactionOpts: txnOpts,
        })
    }

    /**
     * Delegate staking within a space to an operator
     * @param args
     * @param args.spaceId - The space id
     * @param args.operatorAddress - The operator address
     * @returns The transaction
     */
    public async addSpaceDelegation<T = ContractTransaction>(args: {
        spaceId: string
        operatorAddress: string
        signer: ethers.Signer
        transactionOpts?: TransactionOpts
        overrideExecution?: OverrideExecution<T>
    }) {
        const { spaceId, operatorAddress, signer, transactionOpts, overrideExecution } = args
        const space = this.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const spaceAddress = space.Address

        return this.baseRegistry.spaceDelegation.executeCall({
            signer,
            functionName: 'addSpaceDelegation',
            args: [spaceAddress, operatorAddress],
            overrideExecution,
            transactionOpts,
        })
    }
}
