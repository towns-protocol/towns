import {
    BaseChainConfig,
    RiverChainConfig,
    getWeb3Deployment,
    getWeb3Deployments,
    getRiverEnv,
} from '@towns-protocol/web3'
import { dlogger, safeEnv, SafeEnvOpts } from '@towns-protocol/dlog'

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

function getEnvironmentId(opts: SafeEnvOpts | undefined): string {
    const riverEnv = getRiverEnv(opts)
    if (!riverEnv) {
        throw new Error('either RIVER_ENV or VITE_RIVER_ENV is required to be set in process.env')
    }
    return riverEnv
}

function getBaseRpcUrlForChain(chainId: number, opts: SafeEnvOpts | undefined): string {
    switch (chainId) {
        case 31337:
            return 'http://localhost:8545'
        case 84532: {
            const url = safeEnv(
                [
                    'BASE_SEPOLIA_RPC_URL',
                    'BASE_CHAIN_RPC_URL', // deprecated
                ],
                opts,
            )
            if (url) {
                return url
            }
            logger.warn(
                'neither BASE_SEPOLIA_RPC_URL nor VITE_BASE_SEPOLIA_RPC_URL is defined, using sepolia.base.org',
            )
            return 'https://sepolia.base.org'
        }
        case 8453: {
            const url = safeEnv(
                [
                    'BASE_MAINNET_RPC_URL',
                    'BASE_CHAIN_RPC_URL', // deprecated
                ],
                opts,
            )
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

function getRiverRpcUrlForChain(chainId: number, opts: SafeEnvOpts | undefined): string {
    switch (chainId) {
        case 31338:
            return 'http://localhost:8546'
        case 6524490:
            return (
                safeEnv(['RIVER_DEVNET_RPC_URL', 'RIVER_CHAIN_RPC_URL'], opts) ??
                'https://devnet.rpc.river.build'
            )
        case 550:
            return (
                safeEnv(['RIVER_MAINNET_RPC_URL', 'RIVER_CHAIN_RPC_URL'], opts) ??
                'https://mainnet.rpc.river.build'
            )
        default:
            throw new Error(`No preset RPC url for river chainId ${chainId}`)
    }
}

export function getNotificationServiceUrl(environmentId: string, opts?: SafeEnvOpts): string {
    const riverEnv = getRiverEnv(opts)
    if (riverEnv === environmentId) {
        const url = safeEnv(['NOTIFICATION_SERVICE_URL'], opts)
        if (url) {
            return url
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

export function getStreamMetadataUrl(environmentId: string, opts?: SafeEnvOpts): string {
    const riverEnv = getRiverEnv(opts)
    if (riverEnv === environmentId) {
        const url = safeEnv(['STREAM_METADATA_URL'], opts)
        if (url) {
            return url
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

export function getAppRegistryUrl(environmentId: string, opts?: SafeEnvOpts): string {
    const riverEnv = getRiverEnv(opts)
    if (riverEnv === environmentId) {
        const url = safeEnv(['APP_REGISTRY_URL'], opts)
        if (url) {
            return url
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

export function makeRiverChainConfig(
    environmentId?: string,
    opts?: SafeEnvOpts,
): RiverConfig['river'] {
    const env = getWeb3Deployment(environmentId ?? getEnvironmentId(opts), opts)
    return {
        rpcUrl: getRiverRpcUrlForChain(env.river.chainId, opts),
        chainConfig: env.river,
    }
}

export function makeBaseChainConfig(
    environmentId?: string,
    opts?: SafeEnvOpts,
): RiverConfig['base'] {
    const env = getWeb3Deployment(environmentId ?? getEnvironmentId(opts), opts)
    return {
        rpcUrl: getBaseRpcUrlForChain(env.base.chainId, opts),
        chainConfig: env.base,
    }
}

/**
 * @param inEnvironmentId - Environment id to use. If not provided, will use the environment id from the process.env.RIVER_ENV or import.meta.env.VITE_RIVER_ENV.
 * @returns River config
 *
 * If RIVER_ENV is defined, you don't need to pass an enviromnetId here
 * If RIVER_ENV is one of the "deployments" in packages/generated/config/deployments.json,
 * you don't need to set any additional environment variables
 */
export function makeRiverConfig(inEnvironmentId?: string, opts?: SafeEnvOpts): RiverConfig {
    const environmentId = inEnvironmentId ?? getEnvironmentId(opts)
    try {
        const config = {
            environmentId,
            base: makeBaseChainConfig(environmentId, opts),
            river: makeRiverChainConfig(environmentId, opts),
            services: [
                {
                    id: RiverService.Notifications,
                    url: getNotificationServiceUrl(environmentId, opts),
                },
                { id: RiverService.AppRegistry, url: getAppRegistryUrl(environmentId, opts) },
                { id: RiverService.StreamMetadata, url: getStreamMetadataUrl(environmentId, opts) },
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
export function getEnvironmentIds(opts?: SafeEnvOpts): string[] {
    return getWeb3Deployments(opts)
}

/**
 * @returns Available environments DO NOT COMMIT THIS COMMENT
 */
export function getEnvironments(opts?: SafeEnvOpts): RiverConfig[] {
    return getWeb3Deployments(opts).map((id) => {
        return makeRiverConfig(id, opts)
    })
}
