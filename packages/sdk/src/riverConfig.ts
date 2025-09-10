import {
    BaseChainConfig,
    RiverChainConfig,
    getWeb3Deployment,
    getWeb3Deployments,
    getRiverEnv,
} from '@towns-protocol/web3'
import { dlogger, safeEnv } from '@towns-protocol/dlog'

const logger = dlogger('csb:config')

const RIVER_ENV = getRiverEnv()

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

export function getNotificationServiceUrl(environmentId: string): string {
    if (RIVER_ENV === environmentId) {
        if (typeof process === 'object' && process.env.NOTIFICATION_SERVICE_URL) {
            return process.env.NOTIFICATION_SERVICE_URL
        }
    }
    switch (environmentId) {
        case 'local_dev':
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
        if (typeof process === 'object' && process.env.STREAM_METADATA_URL) {
            return process.env.STREAM_METADATA_URL
        }
    }
    switch (environmentId) {
        case 'local_dev':
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
        if (typeof process === 'object' && process.env.APP_REGISTRY_URL) {
            return process.env.APP_REGISTRY_URL
        }
    }
    switch (environmentId) {
        case 'local_dev':
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
    const env = getWeb3Deployment(environmentId ?? getEnvironmentId())
    return {
        rpcUrl: getRiverRpcUrlForChain(env.river.chainId),
        chainConfig: env.river,
    }
}

export function makeBaseChainConfig(environmentId?: string): RiverConfig['base'] {
    const env = getWeb3Deployment(environmentId ?? getEnvironmentId())
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
 * @returns Available environment ids
 */
export function getEnvironmentIds(): string[] {
    return getWeb3Deployments()
}
