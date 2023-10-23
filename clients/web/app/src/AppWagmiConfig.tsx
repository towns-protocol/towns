import React from 'react'
import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { Chain, WagmiConfig as _WagmiConfig, configureChains, createConfig } from 'wagmi'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { baseGoerli, foundry, goerli, localhost, sepolia } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import cloneDeep from 'lodash/cloneDeep'
import { shouldUseWalletConnect } from 'hooks/useShouldUseWalletConnect'
import { env } from 'utils'

export const foundryClone: Chain = cloneDeep(foundry)

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

const SUPPORTED_CHAINS = [goerli, sepolia, foundryClone, baseGoerli, localhost]

const walletConnectors = ({ chains }: { chains: Chain[] }) => {
    const { connectors: rainbowKitConnectors } = getDefaultWallets({
        appName: 'Towns',
        chains,
        projectId: env.VITE_WALLET_CONNECT_PROJECT_ID,
    })

    return shouldUseWalletConnect()
        ? [
              new WalletConnectConnector({
                  chains,
                  options: {
                      projectId: env.VITE_WALLET_CONNECT_PROJECT_ID,
                      metadata: {
                          name: 'Towns',
                          url: 'https://towns.com',
                          description: 'Towns',
                          icons: [],
                      },
                  },
              }),
          ]
        : rainbowKitConnectors()
}

const { chains, publicClient, webSocketPublicClient } = configureChains(
    SUPPORTED_CHAINS,
    env.VITE_ALCHEMY_API_KEY
        ? [alchemyProvider({ apiKey: env.VITE_ALCHEMY_API_KEY }), publicProvider()]
        : [publicProvider()],
    { retryCount: 5 },
)

const wagmiConfig = createConfig({
    autoConnect: true,
    connectors: walletConnectors({ chains }),
    publicClient,
    webSocketPublicClient,
})

export function AppWagmiConfig({ children }: { children: JSX.Element }) {
    return <_WagmiConfig config={wagmiConfig}>{children}</_WagmiConfig>
}
