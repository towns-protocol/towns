import DeploymentsJson from '@towns-protocol/generated/config/deployments.json' with { type: 'json' }

import { Address } from '../types/ContractTypes'
import { check, safeEnv, SafeEnvOpts } from '@towns-protocol/dlog'

export interface BaseChainConfig {
    chainId: number
    addresses: {
        spaceFactory: Address
        spaceOwner: Address
        baseRegistry: Address
        riverAirdrop: Address | undefined
        swapRouter: Address | undefined
        appRegistry: Address
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
export function getWeb3Deployment(riverEnv?: string, opts?: SafeEnvOpts): Web3Deployment {
    // Cast to unknown first to avoid TypeScript error about property compatibility
    riverEnv = riverEnv ?? getRiverEnv(opts)
    if (!riverEnv) {
        throw new Error('RIVER_ENV is not defined')
    }
    const deployments = DeploymentsJson as unknown as Record<string, Web3Deployment | undefined>
    if (deployments[riverEnv]) {
        return deployments[riverEnv] as Web3Deployment
    }
    return makeWeb3Deployment(riverEnv, opts)
}

/**
 * If RIVER_ENV is defined, it will be included in the list of environment ids.
 * If RIVER_ENV is not defined, it will return the list of environment ids from the json file.
 * @returns Environment ids
 * DO NOT COMMIT THIS COMMENT
 */
export function getWeb3Deployments(opts?: SafeEnvOpts) {
    const riverEnv = safeEnv(['RIVER_ENV'], opts)
    const keys = Object.keys(DeploymentsJson)
    if (riverEnv && !keys.includes(riverEnv)) {
        return [riverEnv, ...keys]
    }
    return keys
}

export function getRiverEnv(opts?: SafeEnvOpts) {
    const riverEnv = safeEnv(['RIVER_ENV'], opts)
    return riverEnv
}

function optionalEnv({
    environmentId,
    keys,
    opts,
}: {
    environmentId: string
    keys: string[]
    opts: SafeEnvOpts | undefined
}): string | undefined {
    const riverEnv = getRiverEnv(opts)
    if (environmentId === riverEnv) {
        const value = safeEnv(keys, opts)
        if (value) {
            return value
        }
    }
    return undefined
}

function requiredEnv({
    environmentId,
    keys,
    opts,
}: {
    environmentId: string
    keys: string[]
    opts: SafeEnvOpts | undefined
}): string {
    check(keys.length > 0, 'keys must be an array of at least one key')
    const value = optionalEnv({ environmentId, keys, opts })
    if (!value) {
        throw new Error(
            `One of ${keys.join(', ')}, ${keys.map((key) => `VITE_${key}`).join(', ')} is required to be set in process.env`,
        )
    }
    return value
}

function makeWeb3Deployment(environmentId: string, opts: SafeEnvOpts | undefined): Web3Deployment {
    // check for environment variable overrides, if not use the deployment from the json file
    return {
        base: {
            chainId: parseInt(
                requiredEnv({
                    environmentId,
                    keys: ['BASE_CHAIN_ID'],
                    opts,
                }),
            ),
            addresses: {
                baseRegistry: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_APP_REGISTRY',
                        'BASE_REGISTRY_ADDRESS', // deprecated
                    ],
                    opts,
                }) as Address,
                spaceFactory: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_SPACE_FACTORY',
                        'SPACE_FACTORY_ADDRESS', // deprecated
                    ],
                    opts,
                }) as Address,
                spaceOwner: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_SPACE_OWNER',
                        'SPACE_OWNER_ADDRESS', // deprecated
                    ],
                    opts,
                }) as Address,
                riverAirdrop: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_RIVER_AIRDROP',
                        'RIVER_AIRDROP_ADDRESS', // deprecated
                    ],
                    opts,
                }) as Address,
                swapRouter: optionalEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_SWAP_ROUTER',
                        'SWAP_ROUTER_ADDRESS', // deprecated
                    ],
                    opts,
                }) as Address,
                appRegistry: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_APP_REGISTRY',
                        'APP_REGISTRY_ADDRESS', // deprecated
                    ],
                    opts,
                }) as Address,
                subscriptionModule: requiredEnv({
                    environmentId,
                    keys: ['BASE_ADDRESSES_SUBSCRIPTION_MODULE'],
                    opts,
                }) as Address,
                utils: {
                    mockNFT: optionalEnv({
                        environmentId,
                        keys: [
                            'BASE_ADDRESSES_UTILS_MOCK_NFT',
                            'MOCK_NFT_ADDRESS', // deprecated
                        ],
                        opts,
                    }) as Address,
                    member: optionalEnv({
                        environmentId,
                        keys: [
                            'BASE_ADDRESSES_UTILS_MEMBER',
                            'MEMBER_ADDRESS', // deprecated
                        ],
                        opts,
                    }) as Address,
                    towns: optionalEnv({
                        environmentId,
                        keys: [
                            'BASE_ADDRESSES_UTILS_TOWNS',
                            'TOWNS_ADDRESS', // deprecated
                        ],
                        opts,
                    }) as Address,
                },
            },
        } satisfies BaseChainConfig,
        river: {
            chainId: parseInt(
                requiredEnv({
                    environmentId,
                    keys: ['RIVER_CHAIN_ID'],
                    opts,
                }),
            ),
            addresses: {
                riverRegistry: requiredEnv({
                    environmentId,
                    keys: [
                        'RIVER_ADDRESSES_RIVER_REGISTRY',
                        'RIVER_REGISTRY_ADDRESS', // deprecated
                    ],
                    opts,
                }) as Address,
            },
        } satisfies RiverChainConfig,
    }
}
