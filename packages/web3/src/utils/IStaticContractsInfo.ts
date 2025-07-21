import DeploymentsJson from '@towns-protocol/generated/config/deployments.json' with { type: 'json' }

import { Address } from '../types/ContractTypes'

export interface BaseChainConfig {
    chainId: number
    addresses: {
        spaceFactory: Address
        spaceOwner: Address
        baseRegistry: Address
        riverAirdrop?: Address
        swapRouter?: Address
        towns?: Address
        appRegistry?: Address
        utils: {
            mockNFT?: Address // mockErc721aAddress
            member?: Address // testGatingTokenAddress - For tesing token gating scenarios
            towns?: Address
        }
    }
    executionClient?: 'geth_dev' | undefined
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
    const deployments = DeploymentsJson as unknown as Record<string, Web3Deployment>
    if (!deployments[riverEnv]) {
        throw new Error(
            `Deployment ${riverEnv} not found, available environments: ${Object.keys(
                DeploymentsJson,
            ).join(', ')}`,
        )
    }
    return deployments[riverEnv]
}

export function getWeb3Deployments() {
    return Object.keys(DeploymentsJson)
}
