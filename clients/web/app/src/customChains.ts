import { Chain } from 'viem'
import { baseSepolia, foundry } from 'wagmi/chains'
import { addRpcUrlOverrideToChain } from '@privy-io/react-auth'
import { IChainConfig } from 'use-towns-client'
import { env } from 'utils'

// we hard code some chains to allow the dev clients to switch between environments
const foundryClone: Chain = structuredClone(foundry)

const baseSepoliaClone: Chain = env.VITE_BASE_SEPOLIA_RPC_URL
    ? _makeBaseChain(baseSepolia, env.VITE_BASE_SEPOLIA_RPC_URL, env.VITE_BASE_SEPOLIA_WS_URL)
    : baseSepolia

const anvilRiverChain: IChainConfig = {
    chainId: 31338,
    name: 'anvil_river_chain',
    rpcUrl: 'http://127.0.0.1:8546',
}

const testnetRiverChain: IChainConfig = {
    chainId: 6524490,
    name: 'testnet_river_chain',
    rpcUrl: env.VITE_RIVER_TESTNET_RPC_URL ?? 'https://devnet.rpc.river.build',
}

export const getCustomBaseChain = (chainId: number): Chain => {
    if (chainId === foundryClone.id) {
        return foundryClone
    } else if (chainId === baseSepoliaClone.id) {
        return baseSepoliaClone
    } else {
        throw new Error(`unsupported custom base chain id: ${chainId}`)
    }
}

export function makeBaseChain(chainId: number, rpcUrl: string, wsUrl?: string): Chain {
    if (chainId === foundry.id) {
        return _makeBaseChain(foundry, rpcUrl, wsUrl)
    } else if (chainId === baseSepolia.id) {
        return _makeBaseChain(baseSepolia, rpcUrl, wsUrl)
    } else {
        // aellis - i am not sure if we can just call wagmi "defineChain" here with the chain id and a custom name
        // throwing until i can test it
        throw new Error(`unsupported base chain id: ${chainId}`)
    }
}

function _makeBaseChain(chain: Chain, rpcUrl: string, wsUrl?: string): Chain {
    const rpcUrls = {
        http: [rpcUrl],
        webSocket: wsUrl ? [wsUrl] : undefined,
    }
    // privy says we should use addRpcUrlOverrideToChain to use a custom rpc url https://docs.privy.io/guide/configuration/networks#overriding-a-chains-rpc-provider
    const baseChain = addRpcUrlOverrideToChain(chain, rpcUrl)
    return {
        ...baseChain,
        // this one is for type correctness b/c addRpcUrlOverrideToChain doesn't return a Chain
        network: chain.network,
        rpcUrls: {
            ...baseChain.rpcUrls,
            // and these are required too b/c w/o them privy still flip flops between the public and the override urls, probably some priority/quorom thing
            default: rpcUrls,
            // especially need this one!
            public: rpcUrls,
        },
    }
}

export function makeRiverChain(chainId: number, rpcUrl: string, wsUrl?: string): IChainConfig {
    return {
        chainId,
        name: `river_chain_${chainId}`,
        rpcUrl,
    }
}

export const getCustomRiverChain = (chainId: number): IChainConfig => {
    if (chainId === anvilRiverChain.chainId) {
        return anvilRiverChain
    } else if (chainId === testnetRiverChain.chainId) {
        return testnetRiverChain
    } else {
        throw new Error(`unsupported custom river chain id: ${chainId}`)
    }
}
