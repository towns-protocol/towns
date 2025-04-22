import { Chain } from 'viem'
import { base, baseSepolia, foundry } from 'wagmi/chains'
import { addRpcUrlOverrideToChain } from '@privy-io/react-auth'
import { IChainConfig } from 'use-towns-client'
import { env } from 'utils'

// we hard code some chains to allow the dev clients to switch between environments
const foundryClone: Chain = structuredClone(foundry)

const baseSepoliaClone: Chain = env.VITE_BASE_SEPOLIA_RPC_URL
    ? _makeBaseChain({
          chain: baseSepolia,
          rpcUrl: env.VITE_BASE_SEPOLIA_RPC_URL,
          wsUrl: env.VITE_BASE_SEPOLIA_WS_URL,
      })
    : baseSepolia

const baseClone: Chain = env.VITE_BASE_CHAIN_RPC_URL
    ? _makeBaseChain({
          chain: base,
          rpcUrl: env.VITE_BASE_CHAIN_RPC_URL,
          wsUrl: env.VITE_BASE_CHAIN_WS_URL,
      })
    : base

const gatewayBase: Chain = env.VITE_BASE_CHAIN_RPC_URL
    ? _makeBaseChain({
          chain: base,
          rpcUrl: env.VITE_BASE_CHAIN_RPC_URL,
          gatewayRpcUrl: env.VITE_BASE_RPC_GATEWAY_URL,
          gatewaySamplingRate: env.VITE_BASE_RPC_GATEWAY_SAMPLING_RATE,
          wsUrl: env.VITE_BASE_CHAIN_WS_URL,
      })
    : base

const gatewayBaseSepolia: Chain = env.VITE_BASE_SEPOLIA_RPC_URL
    ? _makeBaseChain({
          chain: baseSepolia,
          rpcUrl: env.VITE_BASE_SEPOLIA_RPC_URL,
          gatewayRpcUrl: env.VITE_BASE_RPC_GATEWAY_URL,
          gatewaySamplingRate: env.VITE_BASE_RPC_GATEWAY_SAMPLING_RATE,
          wsUrl: env.VITE_BASE_SEPOLIA_WS_URL,
      })
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

const mainnetRiverChain: IChainConfig = {
    chainId: 550,
    name: 'mainnet_river_chain',
    rpcUrl: env.VITE_RIVER_CHAIN_RPC_URL ?? 'https://mainnet.rpc.river.build',
}

export const getCustomBaseChain = (chainId: number): Chain => {
    if (chainId === foundryClone.id) {
        return foundryClone
    } else if (chainId === baseSepoliaClone.id) {
        return baseSepoliaClone
    } else if (chainId === baseClone.id) {
        return baseClone
    } else {
        throw new Error(`unsupported custom base chain id: ${chainId}`)
    }
}

export const getBaseGatewayChain = (chainId: number): Chain => {
    if (chainId === foundryClone.id) {
        return foundryClone
    } else if (chainId === baseSepoliaClone.id) {
        return gatewayBaseSepolia
    } else if (chainId === baseClone.id) {
        return gatewayBase
    } else {
        throw new Error(`unsupported custom base chain id: ${chainId}`)
    }
}

function _makeBaseChain(args: {
    chain: Chain
    rpcUrl: string
    gatewayRpcUrl?: string
    gatewaySamplingRate?: number // integer 0-100 representing percentage
    wsUrl?: string
}): Chain {
    const { chain, rpcUrl, gatewayRpcUrl, gatewaySamplingRate, wsUrl } = args

    const effectiveRpcUrl =
        gatewayRpcUrl && Math.random() * 100 < (gatewaySamplingRate ?? 0) ? gatewayRpcUrl : rpcUrl

    const rpcUrls = {
        http: [effectiveRpcUrl],
        webSocket: wsUrl ? [wsUrl] : undefined,
    }
    // privy says we should use addRpcUrlOverrideToChain to use a custom rpc url https://docs.privy.io/guide/configuration/networks#overriding-a-chains-rpc-provider
    const baseChain = addRpcUrlOverrideToChain(chain, effectiveRpcUrl)
    return {
        ...baseChain,
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
    } else if (chainId === mainnetRiverChain.chainId) {
        return mainnetRiverChain
    } else {
        throw new Error(`unsupported custom river chain id: ${chainId}`)
    }
}
