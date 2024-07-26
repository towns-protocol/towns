import { base, baseSepolia, foundry } from 'viem/chains'
import { configureChains, createConfig } from 'wagmi'
import { publicProvider } from '@wagmi/core/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'

const { chains, publicClient, webSocketPublicClient } = configureChains(
    [base, baseSepolia, foundry],
    [publicProvider()],
)

/// If you're using Foundry, run yarn anvil to get the test accounts private keys.
/// This way you can interact with the foundry chain.
export const config = createConfig({
    autoConnect: true,
    publicClient,
    webSocketPublicClient,
    connectors: [new InjectedConnector({ chains })],
})
