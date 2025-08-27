import {
    Address,
    BaseChainConfig,
    RiverChainConfig,
    Web3Deployment,
    getWeb3Deployment,
    getWeb3Deployments,
} from '@towns-protocol/web3'
import { isDefined } from './check'
import { check, dlogger } from '@towns-protocol/dlog'
const logger = dlogger('csb:config')

function getEnvironmentId(): string {
    if (typeof process === 'object') {
        if (process.env.RIVER_ENV) {
            return process.env.RIVER_ENV
        }
        if (process.env.VITE_RIVER_ENV) {
            return process.env.VITE_RIVER_ENV
        }
    }
    throw new Error('neither process.env.RIVER_ENV not process.env.VITE_RIVER_ENV is defined')
}

function getBaseRpcUrlForChain(chainId: number): string {
    switch (chainId) {
        case 31337:
            return 'http://localhost:8545'
        case 84532:
            if (typeof process === 'object') {
                if (process.env.BASE_CHAIN_RPC_URL) {
                    return process.env.BASE_CHAIN_RPC_URL
                }
                if (process.env.BASE_SEPOLIA_RPC_URL) {
                    return process.env.BASE_SEPOLIA_RPC_URL
                }
            }
            logger.warn('BASE_SEPOLIA_RPC_URL is not defined, using sepolia.base.org')
            return 'https://sepolia.base.org'
        case 8453:
            if (typeof process === 'object') {
                if (process.env.BASE_CHAIN_RPC_URL) {
                    return process.env.BASE_CHAIN_RPC_URL
                }
                if (process.env.BASE_MAINNET_RPC_URL) {
                    return process.env.BASE_MAINNET_RPC_URL
                }
            }
            logger.warn('BASE_MAINNET_RPC_URL is not defined, using mainnet.base.org')
            return 'https://mainnet.base.org'
        default:
            throw new Error(`No preset RPC url for base chainId ${chainId}`)
    }
}

function getRiverRpcUrlForChain(chainId: number): string {
    if (typeof process === 'object') {
        if (process.env.RIVER_CHAIN_RPC_URL) {
            return process.env.RIVER_CHAIN_RPC_URL
        }
    }
    switch (chainId) {
        case 31338:
            return 'http://localhost:8546'
        case 6524490:
            return 'https://devnet.rpc.river.build'
        case 550:
            return 'https://mainnet.rpc.river.build'
        default:
            throw new Error(`No preset RPC url for river chainId ${chainId}`)
    }
}

function getBaseChainId(deployment?: Web3Deployment): number {
    if (typeof process === 'object') {
        if (process.env.BASE_CHAIN_ID) {
            return parseInt(process.env.BASE_CHAIN_ID)
        }
    }
    if (deployment?.base.chainId) {
        return deployment.base.chainId
    }
    throw new Error('BASE_CHAIN_ID is not defined')
}

function getRiverChainId(deployment?: Web3Deployment): number {
    if (typeof process === 'object') {
        if (process.env.RIVER_CHAIN_ID) {
            return parseInt(process.env.RIVER_CHAIN_ID)
        }
    }
    if (deployment?.river.chainId) {
        return deployment.river.chainId
    }
    throw new Error('RIVER_CHAIN_ID is not defined')
}

function getBaseRegistryAddress(deployment?: Web3Deployment): Address {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_APP_REGISTRY) {
            return process.env.BASE_ADDRESSES_APP_REGISTRY as Address
        }
        if (process.env.BASE_REGISTRY_ADDRESS) {
            // deprecated
            return process.env.BASE_REGISTRY_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.baseRegistry) {
        return deployment.base.addresses.baseRegistry
    }
    throw new Error('BASE_ADDRESSES_APP_REGISTRY is not defined')
}

function getSpaceFactoryAddress(deployment?: Web3Deployment): Address {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_SPACE_FACTORY) {
            return process.env.BASE_ADDRESSES_SPACE_FACTORY as Address
        }
        // deprecated
        if (process.env.SPACE_FACTORY_ADDRESS) {
            return process.env.SPACE_FACTORY_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.spaceFactory) {
        return deployment.base.addresses.spaceFactory
    }
    throw new Error('SPACE_FACTORY_ADDRESS is not defined')
}

function getSpaceOwnerAddress(deployment?: Web3Deployment): Address {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_SPACE_OWNER) {
            return process.env.BASE_ADDRESSES_SPACE_OWNER as Address
        }
        // deprecated
        if (process.env.SPACE_OWNER_ADDRESS) {
            return process.env.SPACE_OWNER_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.spaceOwner) {
        return deployment.base.addresses.spaceOwner
    }
    throw new Error('BASE_ADDRESSES_SPACE_OWNER is not defined')
}

function getRiverAirdropAddress(deployment?: Web3Deployment): Address | undefined {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_RIVER_AIRDROP) {
            return process.env.BASE_ADDRESSES_RIVER_AIRDROP as Address
        }
        // deprecated
        if (process.env.RIVER_AIRDROP_ADDRESS) {
            return process.env.RIVER_AIRDROP_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.riverAirdrop) {
        return deployment.base.addresses.riverAirdrop
    }
    throw new Error('BASE_ADDRESSES_RIVER_AIRDROP is not defined')
}

function getSwapRouterAddress(deployment?: Web3Deployment): Address | undefined {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_SWAP_ROUTER) {
            return process.env.BASE_ADDRESSES_SWAP_ROUTER as Address
        }
        // deprecated
        if (process.env.SWAP_ROUTER_ADDRESS) {
            return process.env.SWAP_ROUTER_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.swapRouter) {
        return deployment.base.addresses.swapRouter
    }
    return undefined
}

function getTownsAddress(deployment?: Web3Deployment): Address | undefined {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_TOWNS) {
            return process.env.BASE_ADDRESSES_TOWNS as Address
        }
        // deprecated
        if (process.env.TOWNS_ADDRESS) {
            return process.env.TOWNS_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.towns) {
        return deployment.base.addresses.towns
    }
    throw new Error('BASE_ADDRESSES_TOWNS is not defined')
}

function getAppRegistryAddress(deployment?: Web3Deployment): Address | undefined {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_APP_REGISTRY) {
            return process.env.BASE_ADDRESSES_APP_REGISTRY as Address
        }
        // deprecated
        if (process.env.APP_REGISTRY_ADDRESS) {
            return process.env.APP_REGISTRY_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.appRegistry) {
        return deployment.base.addresses.appRegistry
    }
    return undefined
}

function getUtilsMockNFTAddress(deployment?: Web3Deployment): Address | undefined {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_MOCK_NFT) {
            return process.env.BASE_ADDRESSES_MOCK_NFT as Address
        }
        // deprecated
        if (process.env.MOCK_NFT_ADDRESS) {
            return process.env.MOCK_NFT_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.utils.mockNFT) {
        return deployment.base.addresses.utils.mockNFT
    }
    return undefined
}

function getUtilsMemberAddress(deployment?: Web3Deployment): Address | undefined {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_MEMBER) {
            return process.env.BASE_ADDRESSES_MEMBER as Address
        }
        // deprecated
        if (process.env.MEMBER_ADDRESS) {
            return process.env.MEMBER_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.utils.member) {
        return deployment.base.addresses.utils.member
    }
    return undefined
}

function getUtilsTownsAddress(deployment?: Web3Deployment): Address | undefined {
    if (typeof process === 'object') {
        if (process.env.BASE_ADDRESSES_TOWNS) {
            return process.env.BASE_ADDRESSES_TOWNS as Address
        }
        // deprecated
        if (process.env.TOWNS_ADDRESS) {
            return process.env.TOWNS_ADDRESS as Address
        }
    }
    if (deployment?.base.addresses.utils.towns) {
        return deployment.base.addresses.utils.towns
    }
    return undefined
}

function getRiverRegistryAddress(deployment?: Web3Deployment): Address {
    if (typeof process === 'object') {
        if (process.env.RIVER_ADDRESSES_RIVER_REGISTRY) {
            return process.env.RIVER_ADDRESSES_RIVER_REGISTRY as Address
        }
        // deprecated
        if (process.env.RIVER_REGISTRY_ADDRESS) {
            return process.env.RIVER_REGISTRY_ADDRESS as Address
        }
    }
    if (deployment?.river.addresses.riverRegistry) {
        return deployment.river.addresses.riverRegistry
    }
    throw new Error('RIVER_ADDRESSES_RIVER_REGISTRY is not defined')
}

function makeWeb3Deployment(environmentId: string): Web3Deployment {
    const deployment = getWeb3Deployments().includes(environmentId)
        ? getWeb3Deployment(environmentId)
        : undefined

    return {
        base: {
            chainId: getBaseChainId(deployment),
            addresses: {
                baseRegistry: getBaseRegistryAddress(deployment),
                spaceFactory: getSpaceFactoryAddress(deployment),
                spaceOwner: getSpaceOwnerAddress(deployment),
                riverAirdrop: getRiverAirdropAddress(deployment),
                swapRouter: getSwapRouterAddress(deployment),
                towns: getTownsAddress(deployment),
                appRegistry: getAppRegistryAddress(deployment),
                utils: {
                    mockNFT: getUtilsMockNFTAddress(deployment),
                    member: getUtilsMemberAddress(deployment),
                    towns: getUtilsTownsAddress(deployment),
                },
            },
        } satisfies BaseChainConfig,
        river: {
            chainId: getRiverChainId(deployment),
            addresses: {
                riverRegistry: getRiverRegistryAddress(deployment),
            },
        } satisfies RiverChainConfig,
    }
}

export const getNotificationServiceUrl = (environmentId: string) => {
    if (typeof process === 'object') {
        if (process.env.NOTIFICATION_SERVICE_URL) {
            return process.env.NOTIFICATION_SERVICE_URL
        }
    }
    switch (environmentId) {
        case 'alpha':
            return 'https://alpha.river.delivery'
        case 'gamma':
            return 'https://gamma.river.delivery'
        case 'omega':
            return 'https://river.delivery'
        case 'delta':
            return 'https://delta.river.delivery'
        case 'local_multi':
            return undefined // todo
        case 'local_multi_ne':
            return undefined // todo
        default:
            throw new Error(`No notification service url for environmentId ${environmentId}`)
    }
}

export const getStreamMetadataUrl = (environmentId: string) => {
    if (typeof process === 'object') {
        if (process.env.STREAM_METADATA_URL) {
            return process.env.STREAM_METADATA_URL
        }
    }
    switch (environmentId) {
        case 'alpha':
            return 'https://alpha.river.delivery'
        case 'gamma':
            return 'https://gamma.river.delivery'
        case 'omega':
            return 'https://river.delivery'
        case 'delta':
            return 'https://delta.river.delivery'
        case 'local_multi':
            return 'http://localhost:3002'
        case 'local_multi_ne':
            return 'http://localhost:3003'
        default:
            throw new Error(`No stream metadata url for environmentId ${environmentId}`)
    }
}

export const getAppRegistryUrl = (environmentId: string) => {
    if (typeof process === 'object') {
        if (process.env.APP_REGISTRY_URL) {
            return process.env.APP_REGISTRY_URL
        }
    }
    switch (environmentId) {
        case 'local_multi':
            return 'https://localhost:6170'
        case 'local_multi_ne':
            return 'https://localhost:6190'
        case 'alpha':
            return 'https://app-registry.alpha.towns.com'
        case 'gamma':
            return undefined // todo
        case 'omega':
            return undefined // todo
        case 'delta':
            return undefined // todo
        default:
            throw new Error(`No app registry url for environmentId ${environmentId}`)
    }
}

export function makeRiverChainConfig(environmentId?: string) {
    const env = makeWeb3Deployment(environmentId ?? getEnvironmentId())
    return {
        rpcUrl: getRiverRpcUrlForChain(env.river.chainId),
        chainConfig: env.river,
    }
}

export function makeBaseChainConfig(environmentId?: string) {
    const env = makeWeb3Deployment(environmentId ?? getEnvironmentId())
    return {
        rpcUrl: getBaseRpcUrlForChain(env.base.chainId),
        chainConfig: env.base,
    }
}

export enum RiverService {
    Notifications,
    AppRegistry,
    StreamMetadata,
}

export type RiverConfig = {
    environmentId: string
    base: { rpcUrl: string; chainConfig: BaseChainConfig }
    river: { rpcUrl: string; chainConfig: RiverChainConfig }
    services: { id: RiverService; url: string }[]
}

/**
 * @param inEnvironmentId - Environment id to use. If not provided, will use the environment id from the process.env.RIVER_ENV or VITE_RIVER_ENV.
 * @returns River config
 *
 * If RIVER_ENV is defined, you don't need to pass an enviromnetId here
 * If RIVER_ENV is one of the "deployments" in packages/generated/config/deployments.json,
 * you don't need to set any additional environment variables
 */
export function makeRiverConfig(inEnvironmentId?: string) {
    const environmentId = inEnvironmentId ?? getEnvironmentId()
    const config = {
        environmentId,
        base: makeBaseChainConfig(environmentId),
        river: makeRiverChainConfig(environmentId),
        services: [
            { id: RiverService.Notifications, url: getNotificationServiceUrl(environmentId) },
            { id: RiverService.AppRegistry, url: getAppRegistryUrl(environmentId) },
            { id: RiverService.StreamMetadata, url: getStreamMetadataUrl(environmentId) },
        ],
    }
    return config
}
