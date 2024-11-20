import DeploymentsJson from '@river-build/generated/config/deployments.json' assert { type: 'json' }

import { Address } from './ContractTypes'

export interface BaseChainConfig {
    chainId: number
    addresses: {
        spaceFactory: Address
        spaceOwner: Address
        baseRegistry: Address
        riverAirdrop?: Address
        mockNFT?: Address // mockErc721aAddress
        member?: Address // testGatingTokenAddress - For tesing token gating scenarios
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
    const deployments = DeploymentsJson as Record<string, Web3Deployment>
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
