import { base, baseSepolia, foundry } from 'viem/chains'
import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'

/// If you're using Foundry, run yarn anvil to get the test accounts private keys.
/// This way you can interact with the foundry chain.
export const wagmiConfig = createConfig({
    chains: [base, baseSepolia, foundry],
    transports: {
        [base.id]: http('https://base-rpc.publicnode.com'),
        [baseSepolia.id]: http('https://base-sepolia-rpc.publicnode.com'),
        [foundry.id]: http('http://127.0.0.1:8545'),
    },
    connectors: [injected()],
})
