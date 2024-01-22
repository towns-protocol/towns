import React, { useMemo } from 'react'
import { configureChains } from 'wagmi'
import { localhost } from 'wagmi/chains'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { publicProvider } from 'wagmi/providers/public'
import { PrivyProvider as TownsPrivyProvider } from '@towns/privy'
import { env } from 'utils'
import { ENVIRONMENTS, useEnvironment } from 'hooks/useEnvironmnet'
import { baseSepoliaClone, foundryClone } from 'customChains'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'

if (env.VITE_CF_TUNNEL_PREFIX) {
    const rpcUrl = `https://${env.VITE_CF_TUNNEL_PREFIX}-anvil.towns.com`
    foundryClone.rpcUrls = {
        default: {
            http: [rpcUrl],
        },
        public: {
            http: [rpcUrl],
        },
    }
}

const SUPPORTED_CHAINS = [foundryClone, baseSepoliaClone, localhost]

const wagmiChainsConfig = configureChains(
    SUPPORTED_CHAINS,
    env.VITE_PROVIDER_HTTP_URL
        ? [
              jsonRpcProvider({
                  rpc: (chain) => {
                      if (chain.id === foundryClone.id) {
                          const httpUrl = chain.rpcUrls.default.http[0]
                          return {
                              http: httpUrl,
                          }
                      }
                      return {
                          webSocket: baseSepoliaClone.rpcUrls.default.webSocket?.[0],
                          http: baseSepoliaClone.rpcUrls.default.http[0],
                      }
                  },
              }),
              publicProvider(),
          ]
        : [publicProvider()],
    { retryCount: 5 },
)

const logo = '/towns_privy.svg'

export function PrivyProvider({ children }: { children: JSX.Element }) {
    const { chainId } = useEnvironment()
    const theme = useStore((s) => s.theme)

    const chain = useMemo(() => {
        return ENVIRONMENTS.find((e) => e.chainId === chainId)?.chain
    }, [chainId])

    return chain ? (
        <TownsPrivyProvider
            wagmiChainsConfig={wagmiChainsConfig}
            appId={env.VITE_PRIVY_ID}
            config={{
                defaultChain: chain,
                // the privy ethers signer is derived from the supported chains
                // so these chains need to include rpcUrls that point to where we want - alchemy, infura, transient rpc node, etc
                supportedChains: SUPPORTED_CHAINS,
                appearance: {
                    theme: (theme === 'dark'
                        ? Figma.DarkMode.Level2
                        : Figma.LightMode.Level1) as `#${string}`,
                    accentColor: Figma.Colors.Blue,
                    logo,
                },
                embeddedWallets: {
                    createOnLogin: 'all-users',
                    noPromptOnSignature: true,
                },
                // loginMethods: ['sms', 'google', 'twitter', 'apple'], // see privy console - login methods are defined there. also listing them here causes a weird privy console warning
            }}
        >
            {children}
        </TownsPrivyProvider>
    ) : null
}
