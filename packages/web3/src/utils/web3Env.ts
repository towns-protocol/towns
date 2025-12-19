import DeploymentsJson from '@towns-protocol/generated/config/deployments.json' with { type: 'json' }

import { Address } from '../types/ContractTypes'
import { safeEnv, SafeEnvOpts } from '@towns-protocol/utils'

export interface BaseChainConfig {
    chainId: number
    addresses: {
        spaceFactory: Address
        spaceOwner: Address
        baseRegistry: Address
        riverAirdrop: Address | undefined
        swapRouter: Address | undefined
        appRegistry: Address
        accountModules?: Address | undefined
        subscriptionModule: Address | undefined
        utils: {
            mockNFT: Address | undefined // mockErc721aAddress
            member: Address | undefined // testGatingTokenAddress - For tesing token gating scenarios
            towns: Address | undefined
        }
    }
}

export interface RiverChainConfig {
    chainId: number
    addresses: {
        riverRegistry: Address
    }
}

export interface Web3Deployment {
    base: BaseChainConfig
    river: RiverChainConfig
}

// we have multiple keys for the same value for backwards compatibility, priority is left to right
const envKey: Record<string, string[]> = {
    RIVER_ENV: ['RIVER_ENV'],
    BASE_CHAIN_ID: ['BASE_CHAIN_ID'],
    BASE_ADDRESSES_ACCOUNT_MODULES: ['BASE_ADDRESSES_ACCOUNT_MODULES', 'ACCOUNT_MODULES_ADDRESS'],
    BASE_ADDRESSES_APP_REGISTRY: ['BASE_ADDRESSES_APP_REGISTRY', 'BASE_REGISTRY_ADDRESS'],
    BASE_ADDRESSES_SPACE_FACTORY: ['BASE_ADDRESSES_SPACE_FACTORY', 'SPACE_FACTORY_ADDRESS'],
    BASE_ADDRESSES_SPACE_OWNER: ['BASE_ADDRESSES_SPACE_OWNER', 'SPACE_OWNER_ADDRESS'],
    BASE_ADDRESSES_RIVER_AIRDROP: ['BASE_ADDRESSES_RIVER_AIRDROP', 'RIVER_AIRDROP_ADDRESS'],
    BASE_ADDRESSES_SWAP_ROUTER: ['BASE_ADDRESSES_SWAP_ROUTER', 'SWAP_ROUTER_ADDRESS'],
    BASE_ADDRESSES_SUBSCRIPTION_MODULE: ['BASE_ADDRESSES_SUBSCRIPTION_MODULE'],
    BASE_ADDRESSES_UTILS_MOCK_NFT: ['BASE_ADDRESSES_UTILS_MOCK_NFT', 'MOCK_NFT_ADDRESS'],
    BASE_ADDRESSES_UTILS_MEMBER: ['BASE_ADDRESSES_UTILS_MEMBER', 'MEMBER_ADDRESS'],
    BASE_ADDRESSES_UTILS_TOWNS: ['BASE_ADDRESSES_UTILS_TOWNS', 'TOWNS_ADDRESS'],
    RIVER_CHAIN_ID: ['RIVER_CHAIN_ID'],
    RIVER_ADDRESSES_RIVER_REGISTRY: ['RIVER_ADDRESSES_RIVER_REGISTRY', 'RIVER_REGISTRY_ADDRESS'],
}

export function web3Env(opts?: SafeEnvOpts) {
    const globalRiverEnv = safeEnv(envKey.RIVER_ENV, opts)

    const getDeploymentIds = (): string[] => {
        const staticDeploymentIds = Object.keys(DeploymentsJson)
        return globalRiverEnv && !staticDeploymentIds.includes(globalRiverEnv)
            ? [globalRiverEnv, ...staticDeploymentIds]
            : staticDeploymentIds
    }

    const getDeployment = (inRiverEnv?: string): Web3Deployment => {
        const riverEnv = inRiverEnv ?? globalRiverEnv
        if (!riverEnv) {
            throw new Error('RIVER_ENV is not defined')
        }
        const deployments = DeploymentsJson as unknown as Record<string, Web3Deployment | undefined>
        if (deployments[riverEnv]) {
            return deployments[riverEnv]
        }
        if (riverEnv !== globalRiverEnv) {
            throw new Error(
                `Deployment ${riverEnv} not found in deployments.json keys: ${Object.keys(deployments).join(', ')}`,
            )
        }
        const optionalEnv = (keys: string[]): string | undefined => {
            return safeEnv(keys, opts)
        }
        const requiredEnv = (keys: string[]): string => {
            const value = safeEnv(keys, opts)
            if (!value) {
                throw new Error(
                    `One of ${keys.join(', ')}, ${keys.map((key) => `VITE_${key}`).join(', ')} is required to be set in process.env`,
                )
            }
            return value
        }
        return makeWeb3Deployment(optionalEnv, requiredEnv)
    }

    return {
        riverEnv: globalRiverEnv,
        getDeploymentIds,
        getDeployment,
    }
}

function makeWeb3Deployment(
    optionalEnv: (keys: string[]) => string | undefined,
    requiredEnv: (keys: string[]) => string,
): Web3Deployment {
    // check for environment variable overrides, if not use the deployment from the json file
    return {
        base: {
            chainId: parseInt(requiredEnv(envKey.BASE_CHAIN_ID)),
            addresses: {
                accountModules: optionalEnv(envKey.BASE_ADDRESSES_ACCOUNT_MODULES) as Address,
                baseRegistry: requiredEnv(envKey.BASE_ADDRESSES_APP_REGISTRY) as Address,
                spaceFactory: requiredEnv(envKey.BASE_ADDRESSES_SPACE_FACTORY) as Address,
                spaceOwner: requiredEnv(envKey.BASE_ADDRESSES_SPACE_OWNER) as Address,
                riverAirdrop: requiredEnv(envKey.BASE_ADDRESSES_RIVER_AIRDROP) as Address,
                swapRouter: optionalEnv(envKey.BASE_ADDRESSES_SWAP_ROUTER) as Address,
                appRegistry: requiredEnv(envKey.BASE_ADDRESSES_APP_REGISTRY) as Address,
                subscriptionModule: requiredEnv(
                    envKey.BASE_ADDRESSES_SUBSCRIPTION_MODULE,
                ) as Address,
                utils: {
                    mockNFT: optionalEnv(envKey.BASE_ADDRESSES_UTILS_MOCK_NFT) as Address,
                    member: optionalEnv(envKey.BASE_ADDRESSES_UTILS_MEMBER) as Address,
                    towns: optionalEnv(envKey.BASE_ADDRESSES_UTILS_TOWNS) as Address,
                },
            },
        } satisfies BaseChainConfig,
        river: {
            chainId: parseInt(requiredEnv(envKey.RIVER_CHAIN_ID)),
            addresses: {
                riverRegistry: requiredEnv(envKey.RIVER_ADDRESSES_RIVER_REGISTRY) as Address,
            },
        } satisfies RiverChainConfig,
    }
}
