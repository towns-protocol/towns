import {
    Address,
    BaseChainConfig,
    ContractVersion,
    RiverChainConfig,
    Web3Deployment,
    getWeb3Deployment,
    getWeb3Deployments,
} from '@river-build/web3'
import { isDefined } from './check'
import { check } from '@river-build/dlog'

function getEnvironmentId(): string {
    return process.env.RIVER_ENV || 'local_single'
}

function getBaseRpcUrlForChain(chainId: number): string {
    if (process.env.BASE_CHAIN_RPC_URL) {
        return process.env.BASE_CHAIN_RPC_URL
    }
    switch (chainId) {
        case 31337:
            return 'http://localhost:8545'
        case 84532:
            return 'https://sepolia.base.org'
        default:
            throw new Error(`No preset RPC url for base chainId ${chainId}`)
    }
}

function getRiverRpcUrlForChain(chainId: number): string {
    if (process.env.RIVER_CHAIN_RPC_URL) {
        return process.env.RIVER_CHAIN_RPC_URL
    }
    switch (chainId) {
        case 31338:
            return 'http://localhost:8546'
        case 6524490:
            return 'https://devnet.rpc.river.build'
        default:
            throw new Error(`No preset RPC url for river chainId ${chainId}`)
    }
}

function makeWeb3Deployment(environmentId: string): Web3Deployment {
    if (getWeb3Deployments().includes(environmentId)) {
        return getWeb3Deployment(environmentId)
    }
    // Fallback to env vars
    check(isDefined(process.env.BASE_CHAIN_ID), 'BASE_CHAIN_ID is not defined')
    check(isDefined(process.env.BASE_CHAIN_RPC_URL), 'BASE_CHAIN_RPC_URL is not defined')
    check(isDefined(process.env.SPACE_FACTORY_ADDRESS), 'SPACE_FACTORY_ADDRESS is not defined')
    check(isDefined(process.env.SPACE_OWNER_ADDRESS), 'SPACE_OWNER_ADDRESS is not defined')
    check(isDefined(process.env.RIVER_CHAIN_ID), 'RIVER_CHAIN_ID is not defined')
    check(isDefined(process.env.RIVER_CHAIN_RPC_URL), 'RIVER_CHAIN_RPC_URL is not defined')
    check(isDefined(process.env.RIVER_REGISTRY_ADDRESS), 'RIVER_REGISTRY_ADDRESS is not defined')

    return {
        base: {
            chainId: parseInt(process.env.BASE_CHAIN_ID!),
            contractVersion: (process.env.CONTRACT_VERSION ?? 'dev') as ContractVersion,
            addresses: {
                spaceFactory: process.env.SPACE_FACTORY_ADDRESS! as Address,
                spaceOwner: process.env.SPACE_OWNER_ADDRESS! as Address,
                mockNFT: process.env.MOCK_NFT_ADDRESS as Address | undefined,
                member: process.env.MEMBER_ADDRESS as Address | undefined,
            },
        } satisfies BaseChainConfig,
        river: {
            chainId: parseInt(process.env.RIVER_CHAIN_ID!),
            contractVersion: (process.env.CONTRACT_VERSION ?? 'dev') as ContractVersion,
            addresses: {
                riverRegistry: process.env.RIVER_REGISTRY_ADDRESS! as Address,
            },
        } satisfies RiverChainConfig,
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

export type RiverConfig = ReturnType<typeof makeRiverConfig>

export function makeRiverConfig(inEnvironmentId?: string) {
    const environmentId = inEnvironmentId ?? getEnvironmentId()
    const config = {
        environmentId,
        base: makeBaseChainConfig(environmentId),
        river: makeRiverChainConfig(environmentId),
    }
    return config
}
