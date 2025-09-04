import DeploymentsJson from '@towns-protocol/generated/config/deployments.json' with { type: 'json' }

import { Address } from '../types/ContractTypes'

export interface BaseChainConfig {
    chainId: number
    addresses: {
        spaceFactory: Address
        spaceOwner: Address
        baseRegistry: Address
        riverAirdrop: Address | undefined
        swapRouter: Address | undefined
        appRegistry: Address | undefined
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
