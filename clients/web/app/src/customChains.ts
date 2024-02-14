import { Chain } from 'wagmi'
import { baseSepolia, foundry } from 'wagmi/chains'
import { addRpcUrlOverrideToChain } from '@privy-io/react-auth'
import { env } from 'utils'

export const foundryClone: Chain = structuredClone(foundry)

const baseSepoliaRpcUrls: {
    http: string[]
    webSocket?: string[]
} = {
    http: [env.VITE_PROVIDER_HTTP_URL ?? ''],
}

if (env.VITE_PROVIDER_WS_URL) {
    baseSepoliaRpcUrls.webSocket = [env.VITE_PROVIDER_WS_URL]
}

// privy says we should use addRpcUrlOverrideToChain to use a custom rpc url https://docs.privy.io/guide/configuration/networks#overriding-a-chains-rpc-provider
const overrideBaseSepolia = addRpcUrlOverrideToChain(baseSepolia, baseSepoliaRpcUrls.http[0])

export const baseSepoliaClone: Chain = env.VITE_PROVIDER_HTTP_URL
    ? {
          ...overrideBaseSepolia,
          // this one is for type correctness b/c addRpcUrlOverrideToChain doesn't return a Chain
          network: baseSepolia.network,
          rpcUrls: {
              ...overrideBaseSepolia.rpcUrls,
              // and these are required too b/c w/o them privy still flip flops between the public and the override urls, probably some priority/quorom thing
              default: baseSepoliaRpcUrls,
              // especially need this one!
              public: baseSepoliaRpcUrls,
          },
      }
    : baseSepolia
