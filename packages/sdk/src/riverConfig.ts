import {
    Address,
    BaseChainConfig,
    RiverChainConfig,
    Web3Deployment,
    getWeb3Deployment,
    getWeb3Deployments,
} from '@towns-protocol/web3'
import { check, dlogger } from '@towns-protocol/dlog'
const logger = dlogger('csb:config')

export enum RiverService {
    Notifications,
    AppRegistry,
    StreamMetadata,
}

export type RiverConfig = {
    environmentId: string
    base: { rpcUrl: string; chainConfig: BaseChainConfig }
    river: { rpcUrl: string; chainConfig: RiverChainConfig }
    services: { id: RiverService; url: string | undefined }[]
}

const RIVER_ENV = safeEnv(['RIVER_ENV'])

function safeEnv(keys: string[]): string | undefined {
    if (typeof process !== 'object') {
        return undefined
    }
    for (const key of keys) {
        // look for the key in process.env
        if (process.env[key]) {
            return process.env[key]
        }
        // look for the key in process.env.VITE_ for vite apps
        const viteKey = `VITE_${key}`
        if (process.env[viteKey]) {
            return process.env[viteKey]
        }
    }
    return undefined
}

function optionalEnv({
    environmentId,
    keys,
    defaultValue,
}: {
    environmentId: string
    keys: string[]
    defaultValue?: string
}): string | undefined {
    if (environmentId === RIVER_ENV) {
        const value = safeEnv(keys)
        if (value) {
            return value
        }
    }
    if (defaultValue) {
        return defaultValue
    }
    return undefined
}

function requiredEnv({
    environmentId,
    keys,
    defaultValue,
}: {
    environmentId: string
    keys: string[]
    defaultValue?: string
}): string {
    check(keys.length > 0, 'keys must be an array of at least one key')
    const value = optionalEnv({ environmentId, keys, defaultValue })
    if (!value) {
        throw new Error(
            `One of ${keys.join(', ')}, ${keys.map((key) => `VITE_${key}`).join(', ')} is required to be set in process.env`,
        )
    }
    return value
}

function getEnvironmentId(): string {
    if (!RIVER_ENV) {
        throw new Error('either RIVER_ENV or VITE_RIVER_ENV is required to be set in process.env')
    }
    return RIVER_ENV
}

function getBaseRpcUrlForChain(chainId: number): string {
    switch (chainId) {
        case 31337:
            return 'http://localhost:8545'
        case 84532: {
            const url = safeEnv([
                'BASE_SEPOLIA_RPC_URL',
                'BASE_CHAIN_RPC_URL', // deprecated
            ])
            if (url) {
                return url
            }
            logger.warn(
                'neither BASE_SEPOLIA_RPC_URL nor VITE_BASE_SEPOLIA_RPC_URL is defined, using sepolia.base.org',
            )
            return 'https://sepolia.base.org'
        }
        case 8453: {
            const url = safeEnv([
                'BASE_MAINNET_RPC_URL',
                'BASE_CHAIN_RPC_URL', // deprecated
            ])
            if (url) {
                return url
            }
            logger.warn(
                'neither BASE_MAINNET_RPC_URL nor VITE_BASE_MAINNET_RPC_URL is defined, using mainnet.base.org',
            )
            return 'https://mainnet.base.org'
        }
        default:
            throw new Error(`No preset RPC url for base chainId ${chainId}`)
    }
}

function getRiverRpcUrlForChain(chainId: number): string {
    switch (chainId) {
        case 31338:
            return 'http://localhost:8546'
        case 6524490:
            return (
                safeEnv(['RIVER_DEVNET_RPC_URL', 'RIVER_CHAIN_RPC_URL']) ??
                'https://devnet.rpc.river.build'
            )
        case 550:
            return (
                safeEnv(['RIVER_MAINNET_RPC_URL', 'RIVER_CHAIN_RPC_URL']) ??
                'https://mainnet.rpc.river.build'
            )
        default:
            throw new Error(`No preset RPC url for river chainId ${chainId}`)
    }
}

function makeWeb3Deployment(environmentId: string): Web3Deployment {
    const deployment = getWeb3Deployments().includes(environmentId)
        ? getWeb3Deployment(environmentId)
        : undefined
    // use the checked in deployment if it exists, otherwise use the environment variables
    return {
        base: {
            chainId: parseInt(
                requiredEnv({
                    environmentId,
                    keys: ['BASE_CHAIN_ID'],
                    defaultValue: deployment?.base.chainId.toString(),
                }),
            ),
            addresses: {
                baseRegistry: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_APP_REGISTRY',
                        'BASE_REGISTRY_ADDRESS', // deprecated
                    ],
                    defaultValue: deployment?.base.addresses.baseRegistry,
                }) as Address,
                spaceFactory: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_SPACE_FACTORY',
                        'SPACE_FACTORY_ADDRESS', // deprecated
                    ],
                    defaultValue: deployment?.base.addresses.spaceFactory,
                }) as Address,
                spaceOwner: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_SPACE_OWNER',
                        'SPACE_OWNER_ADDRESS', // deprecated
                    ],
                    defaultValue: deployment?.base.addresses.spaceOwner,
                }) as Address,
                riverAirdrop: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_RIVER_AIRDROP',
                        'RIVER_AIRDROP_ADDRESS', // deprecated
                    ],
                    defaultValue: deployment?.base.addresses.riverAirdrop,
                }) as Address,
                swapRouter: optionalEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_SWAP_ROUTER',
                        'SWAP_ROUTER_ADDRESS', // deprecated
                    ],
                    defaultValue: deployment?.base.addresses.swapRouter,
                }) as Address,
                appRegistry: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_APP_REGISTRY',
                        'APP_REGISTRY_ADDRESS', // deprecated
                    ],
                    defaultValue: deployment?.base.addresses.appRegistry,
                }) as Address,
                utils: {
                    mockNFT: optionalEnv({
                        environmentId,
                        keys: [
                            'BASE_ADDRESSES_MOCK_NFT',
                            'MOCK_NFT_ADDRESS', // deprecated
                        ],
                        defaultValue: deployment?.base.addresses.utils.mockNFT,
                    }) as Address,
                    member: optionalEnv({
                        environmentId,
                        keys: [
                            'BASE_ADDRESSES_MEMBER',
                            'MEMBER_ADDRESS', // deprecated
                        ],
                        defaultValue: deployment?.base.addresses.utils.member,
                    }) as Address,
                    towns: optionalEnv({
                        environmentId,
                        keys: [
                            'BASE_ADDRESSES_TOWNS',
                            'TOWNS_ADDRESS', // deprecated
                        ],
                        defaultValue: deployment?.base.addresses.utils.towns,
                    }) as Address,
                },
            },
        } satisfies BaseChainConfig,
        river: {
            chainId: parseInt(
                requiredEnv({
                    environmentId,
                    keys: ['RIVER_CHAIN_ID'],
                    defaultValue: deployment?.river.chainId.toString(),
                }),
            ),
            addresses: {
                riverRegistry: requiredEnv({
                    environmentId,
                    keys: [
                        'RIVER_ADDRESSES_RIVER_REGISTRY',
                        'RIVER_REGISTRY_ADDRESS', // deprecated
                    ],
                    defaultValue: deployment?.river.addresses.riverRegistry,
                }) as Address,
            },
        } satisfies RiverChainConfig,
    }
}

export function getNotificationServiceUrl(environmentId: string): string {
    if (RIVER_ENV === environmentId) {
        if (process.env.NOTIFICATION_SERVICE_URL) {
            return process.env.NOTIFICATION_SERVICE_URL
        }
    }
    switch (environmentId) {
        case 'local_multi':
            return 'http://localhost:7170'
        case 'alpha':
            return 'https://river-notification-service-alpha.towns.com'
        case 'delta':
            return 'https://river-notification-service-delta.towns.com'
        case 'gamma':
            return 'https://river-notification-service-gamma.towns.com'
        case 'omega':
            return 'https://river-notification-service-omega.towns.com'
        default:
            throw new Error(`No notification service url for environmentId ${environmentId}`)
    }
}

export function getStreamMetadataUrl(environmentId: string): string {
    if (RIVER_ENV === environmentId) {
        if (process.env.STREAM_METADATA_URL) {
            return process.env.STREAM_METADATA_URL
        }
    }
    switch (environmentId) {
        case 'local_multi':
            return 'http://localhost:3002'
        case 'alpha':
            return 'https://alpha.river.delivery'
        case 'delta':
            return 'https://delta.river.delivery'
        case 'gamma':
            return 'https://gamma.river.delivery'
        case 'omega':
            return 'https://river.delivery'
        default:
            throw new Error(`No stream metadata url for environmentId ${environmentId}`)
    }
}

export function getAppRegistryUrl(environmentId: string): string {
    if (RIVER_ENV === environmentId) {
        if (process.env.APP_REGISTRY_URL) {
            return process.env.APP_REGISTRY_URL
        }
    }
    switch (environmentId) {
        case 'local_multi':
            return 'https://localhost:6170'
        case 'alpha':
            return 'https://app-registry.alpha.towns.com'
        case 'gamma':
            return 'https://app-registry.gamma.towns.com'
        case 'omega':
            return 'https://app-registry.omega.towns.com'
        case 'delta':
            return 'https://app-registry.delta.towns.com'
        default:
            throw new Error(`No app registry url for environmentId ${environmentId}`)
    }
}

export function makeRiverChainConfig(environmentId?: string): RiverConfig['river'] {
    const env = makeWeb3Deployment(environmentId ?? getEnvironmentId())
    return {
        rpcUrl: getRiverRpcUrlForChain(env.river.chainId),
        chainConfig: env.river,
    }
}

export function makeBaseChainConfig(environmentId?: string): RiverConfig['base'] {
    const env = makeWeb3Deployment(environmentId ?? getEnvironmentId())
    return {
        rpcUrl: getBaseRpcUrlForChain(env.base.chainId),
        chainConfig: env.base,
    }
}

/**
 * @param inEnvironmentId - Environment id to use. If not provided, will use the environment id from the process.env.RIVER_ENV or VITE_RIVER_ENV.
 * @returns River config
 *
 * If RIVER_ENV is defined, you don't need to pass an enviromnetId here
 * If RIVER_ENV is one of the "deployments" in packages/generated/config/deployments.json,
 * you don't need to set any additional environment variables
 */
export function makeRiverConfig(inEnvironmentId?: string): RiverConfig {
    const environmentId = inEnvironmentId ?? getEnvironmentId()
    try {
        const config = {
            environmentId,
            base: makeBaseChainConfig(environmentId),
            river: makeRiverChainConfig(environmentId),
            services: [
                { id: RiverService.Notifications, url: getNotificationServiceUrl(environmentId) },
                { id: RiverService.AppRegistry, url: getAppRegistryUrl(environmentId) },
                { id: RiverService.StreamMetadata, url: getStreamMetadataUrl(environmentId) },
            ],
        } satisfies RiverConfig
        return config
    } catch (error) {
        throw new Error(
            `couldn't load config for env: "${environmentId}" error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
    }
}

/**
 * If RIVER_ENV is defined, it will be included in the list of environment ids.
 * If RIVER_ENV is not defined, it will return the list of environment ids from the web3 deployments.
 * @returns Environment ids
 */
export function getEnvironmentIds(): string[] {
    const deployments = getWeb3Deployments()
    if (RIVER_ENV && !deployments.includes(RIVER_ENV)) {
        return [RIVER_ENV, ...deployments]
    }
    return deployments
}
