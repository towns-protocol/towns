import React from 'react'
import { configureChains } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { PrivyProvider as TownsPrivyProvider } from '@towns/privy'
import uniqBy from 'lodash/uniqBy'
import { env } from 'utils'
import { ENVIRONMENTS, useEnvironment } from 'hooks/useEnvironmnet'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'
import { Buffer } from 'buffer'

// polyfill Buffer for client
// lib/src/index.ts does this too but this module can load faster apparently
// the error is thrown from coinbase wallet sdk, which is included w/ wagmi.
// Though we don't use coinbase wallet, it's triggered either b/c of wagmi or b/c of privy's wagmi connector
if (!window.Buffer) {
    window.Buffer = Buffer
}

const SUPPORTED_CHAINS = uniqBy(
    ENVIRONMENTS.map((env) => env.baseChain),
    (x) => x.id,
)

// the chains are custom configured to include the rpcUrls we want to use, the publicProvider is a function that just checks null for us
const wagmiChainsConfig = configureChains(SUPPORTED_CHAINS, [publicProvider()], { retryCount: 5 })

const logo = '/towns_privy.svg'

export function PrivyProvider({ children }: { children: JSX.Element }) {
    const { baseChain: chain } = useEnvironment()
    const theme = useStore((s) => s.getTheme())

    return (
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
                loginMethods: ['sms', 'google', 'twitter', 'apple'],
            }}
        >
            {children}
        </TownsPrivyProvider>
    )
}
