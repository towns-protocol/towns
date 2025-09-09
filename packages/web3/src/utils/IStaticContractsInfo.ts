import DeploymentsJson from '@towns-protocol/generated/config/deployments.json' with { type: 'json' }

import { Address } from '../types/ContractTypes'
import { check, safeEnv } from '@towns-protocol/dlog'

const RIVER_ENV = safeEnv(['RIVER_ENV'])

export interface BaseChainConfig {
    chainId: number
    addresses: {
        spaceFactory: Address
        spaceOwner: Address
        baseRegistry: Address
        riverAirdrop: Address | undefined
        swapRouter: Address | undefined
        appRegistry: Address
        subscriptionModule: Address
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
export function getWeb3Deployment(riverEnv: string): Web3Deployment {
    // Cast to unknown first to avoid TypeScript error about property compatibility
    const deployments = DeploymentsJson as unknown as Record<string, Web3Deployment | undefined>
    if (deployments[riverEnv]) {
        return deployments[riverEnv]
    }
    return makeWeb3Deployment(riverEnv)
}

/**
 * If RIVER_ENV is defined, it will be included in the list of environment ids.
 * If RIVER_ENV is not defined, it will return the list of environment ids from the json file.
 * @returns Environment ids
 */
export function getWeb3Deployments() {
    const keys = Object.keys(DeploymentsJson)
    if (RIVER_ENV && !keys.includes(RIVER_ENV)) {
        return [RIVER_ENV, ...keys]
    }
    return keys
}

export function getRiverEnv() {
    return RIVER_ENV
}

function optionalEnv({
    environmentId,
    keys,
}: {
    environmentId: string
    keys: string[]
}): string | undefined {
    if (environmentId === RIVER_ENV) {
        const value = safeEnv(keys)
        if (value) {
            return value
        }
    }
    return undefined
}

function requiredEnv({ environmentId, keys }: { environmentId: string; keys: string[] }): string {
    check(keys.length > 0, 'keys must be an array of at least one key')
    const value = optionalEnv({ environmentId, keys })
    if (!value) {
        throw new Error(
            `One of ${keys.join(', ')}, ${keys.map((key) => `VITE_${key}`).join(', ')} is required to be set in process.env`,
        )
    }
    return value
}

function makeWeb3Deployment(environmentId: string): Web3Deployment {
    // check for environment variable overrides, if not use the deployment from the json file
    return {
        base: {
            chainId: parseInt(
                requiredEnv({
                    environmentId,
                    keys: ['BASE_CHAIN_ID'],
                }),
            ),
            addresses: {
                baseRegistry: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_APP_REGISTRY',
                        'BASE_REGISTRY_ADDRESS', // deprecated
                    ],
                }) as Address,
                spaceFactory: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_SPACE_FACTORY',
                        'SPACE_FACTORY_ADDRESS', // deprecated
                    ],
                }) as Address,
                spaceOwner: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_SPACE_OWNER',
                        'SPACE_OWNER_ADDRESS', // deprecated
                    ],
                }) as Address,
                riverAirdrop: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_RIVER_AIRDROP',
                        'RIVER_AIRDROP_ADDRESS', // deprecated
                    ],
                }) as Address,
                swapRouter: optionalEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_SWAP_ROUTER',
                        'SWAP_ROUTER_ADDRESS', // deprecated
                    ],
                }) as Address,
                appRegistry: requiredEnv({
                    environmentId,
                    keys: [
                        'BASE_ADDRESSES_APP_REGISTRY',
                        'APP_REGISTRY_ADDRESS', // deprecated
                    ],
                }) as Address,
                utils: {
                    mockNFT: optionalEnv({
                        environmentId,
                        keys: [
                            'BASE_ADDRESSES_MOCK_NFT',
                            'MOCK_NFT_ADDRESS', // deprecated
                        ],
                    }) as Address,
                    member: optionalEnv({
                        environmentId,
                        keys: [
                            'BASE_ADDRESSES_MEMBER',
                            'MEMBER_ADDRESS', // deprecated
                        ],
                    }) as Address,
                    towns: optionalEnv({
                        environmentId,
                        keys: [
                            'BASE_ADDRESSES_TOWNS',
                            'TOWNS_ADDRESS', // deprecated
                        ],
                    }) as Address,
                },
            },
        } satisfies BaseChainConfig,
        river: {
            chainId: parseInt(
                requiredEnv({
                    environmentId,
                    keys: ['RIVER_CHAIN_ID'],
                }),
            ),
            addresses: {
                riverRegistry: requiredEnv({
                    environmentId,
                    keys: [
                        'RIVER_ADDRESSES_RIVER_REGISTRY',
                        'RIVER_REGISTRY_ADDRESS', // deprecated
                    ],
                }) as Address,
            },
        } satisfies RiverChainConfig,
    }
}
