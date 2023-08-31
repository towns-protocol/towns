import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { Chain, configureChains, createConfig } from 'wagmi'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { foundry, goerli, localhost, sepolia } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { shouldUseWalletConnect } from 'hooks/useShouldUseWalletConnect'
import { env } from 'utils'

const SUPPORTED_CHAINS = [goerli, sepolia, foundry, localhost]

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

export const wagmiConfig = createConfig({
    autoConnect: true,
    connectors: walletConnectors({ chains }),
    publicClient,
    webSocketPublicClient,
})
