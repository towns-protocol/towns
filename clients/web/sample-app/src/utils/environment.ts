import { Chain, base, baseSepolia, foundry } from 'wagmi/chains'
import {
    BaseChainConfig,
    IChainConfig,
    RiverChainConfig,
    getWeb3Deployment,
    getWeb3Deployments,
} from 'use-towns-client'

const anvilRiverChain: IChainConfig = {
    chainId: 31338,
    name: 'anvil_river_chain',
    rpcUrl: 'http://127.0.0.1:8546',
}

const riverChain: IChainConfig = {
    chainId: 6524490,
    name: 'river_chain',
    rpcUrl: 'https://devnet.rpc.river.build/',
}

const mainnetRiverChain: IChainConfig = {
    chainId: 550,
    name: 'mainnet_river_chain',
    rpcUrl: import.meta.env.VITE_RIVER_CHAIN_RPC_URL ?? 'https://mainnet.rpc.river.build',
}

const baseSepoliaClone: Chain = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL
    ? {
          ...baseSepolia,
          rpcUrls: {
              ...baseSepolia.rpcUrls,
              default: {
                  http: [import.meta.env.VITE_BASE_SEPOLIA_RPC_URL],
                  webSocket: import.meta.env.VITE_BASE_SEPOLIA_WS_URL
                      ? [import.meta.env.VITE_BASE_SEPOLIA_WS_URL]
                      : undefined,
              },
              public: {
                  http: [import.meta.env.VITE_BASE_SEPOLIA_RPC_URL],
                  webSocket: import.meta.env.VITE_BASE_SEPOLIA_WS_URL
                      ? [import.meta.env.VITE_BASE_SEPOLIA_WS_URL]
                      : undefined,
              },
          },
      }
    : baseSepolia

const baseClone: Chain = import.meta.env.VITE_BASE_RPC_URL
    ? {
          ...base,
          rpcUrls: {
              ...base.rpcUrls,
              default: {
                  http: [import.meta.env.VITE_BASE_RPC_URL],
                  webSocket: import.meta.env.VITE_BASE_WS_URL
                      ? [import.meta.env.VITE_BASE_WS_URL]
                      : undefined,
              },
              public: {
                  http: [import.meta.env.VITE_BASE_RPC_URL],
                  webSocket: import.meta.env.VITE_BASE_WS_URL
                      ? [import.meta.env.VITE_BASE_WS_URL]
                      : undefined,
              },
          },
      }
    : base

function getBaseChainFromId(chainId: number): Chain {
    switch (chainId) {
        case foundry.id:
            return foundry
        case baseSepoliaClone.id:
            return baseSepoliaClone
        case baseClone.id:
            return baseClone
        default:
            throw new Error(`Unknown chain id ${chainId}`)
    }
}

function getRiverChainFromId(chainId: number): IChainConfig {
    switch (chainId) {
        case anvilRiverChain.chainId:
            return anvilRiverChain
        case riverChain.chainId:
            return riverChain
        case mainnetRiverChain.chainId:
            return mainnetRiverChain
        default:
            throw new Error(`Unknown chain id ${chainId}`)
    }
}

export interface TownsEnvironmentInfo {
    id: string
    name: string
    baseChain: Chain
    baseChainConfig: BaseChainConfig
    riverChain: IChainConfig
    riverChainConfig: RiverChainConfig
}

export const ENVIRONMENTS: TownsEnvironmentInfo[] = getWeb3Deployments().map((env) => {
    const { base, river } = getWeb3Deployment(env)
    return {
        id: env,
        name: env,
        baseChain: getBaseChainFromId(base.chainId),
        baseChainConfig: base,
        riverChain: getRiverChainFromId(river.chainId),
        riverChainConfig: river,
    }
})
