import { Chain, baseSepolia, foundry } from 'wagmi/chains'
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

function getBaseChainFromId(chainId: number): Chain {
    switch (chainId) {
        case foundry.id:
            return foundry
        case baseSepoliaClone.id:
            return baseSepoliaClone
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
