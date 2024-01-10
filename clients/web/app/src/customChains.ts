import { Chain } from 'wagmi'
import { baseSepolia, foundry } from 'wagmi/chains'
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

export const baseSepoliaClone: Chain = env.VITE_PROVIDER_HTTP_URL
    ? {
          ...baseSepolia,
          rpcUrls: {
              default: baseSepoliaRpcUrls,
              public: baseSepoliaRpcUrls,
          },
      }
    : baseSepolia
