import React, { useMemo } from 'react'
import { baseSepolia, foundry, localhost } from 'wagmi/chains'
import { configureChains } from 'wagmi'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { publicProvider } from 'wagmi/providers/public'
import { PrivyProvider as _PrivyProvider } from '@privy-io/react-auth'
import { PrivyProvider as TownsPrivyProvider } from '@towns/privy'
import { useEnvironment } from 'hooks/use-environment'
import { ENVIRONMENTS } from 'utils/environment'

const PROVIDER_HTTP_URL = import.meta.env.VITE_PROVIDER_HTTP_URL ?? ''
const PROVIDER_WS_URL = import.meta.env.VITE_PROVIDER_WS_URL ?? ''
const PRIVY_ID = import.meta.env.VITE_PRIVY_ID ?? ''

const SUPPORTED_CHAINS = [foundry, baseSepolia, localhost]

export const wagmiChainsConfig = configureChains(
    SUPPORTED_CHAINS,
    PROVIDER_HTTP_URL
        ? [
              jsonRpcProvider({
                  rpc: (chain) => {
                      if (chain.id === foundry.id) {
                          const httpUrl = chain.rpcUrls.default.http[0]
                          return {
                              http: httpUrl,
                          }
                      }
                      return {
                          webSocket: PROVIDER_WS_URL,
                          http: PROVIDER_HTTP_URL ?? '',
                      }
                  },
              }),
              publicProvider(),
          ]
        : [publicProvider()],
    { retryCount: 5 },
)
export function PrivyProvider({ children }: { children: JSX.Element }) {
    const { chainId } = useEnvironment()

    const chain = useMemo(() => {
        return ENVIRONMENTS.find((e) => e.chainId === chainId)?.chain
    }, [chainId])

    return chain ? (
        <TownsPrivyProvider
            appId={PRIVY_ID}
            wagmiChainsConfig={wagmiChainsConfig}
            config={{
                defaultChain: chain,
                supportedChains: SUPPORTED_CHAINS,
                embeddedWallets: {
                    createOnLogin: 'all-users',
                    noPromptOnSignature: true,
                },
                loginMethods: ['sms', 'google', 'twitter', 'apple'],
            }}
        >
            {children}
        </TownsPrivyProvider>
    ) : null
}
