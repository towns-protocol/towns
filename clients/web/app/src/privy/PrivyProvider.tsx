import React from 'react'
import { PrivyProvider } from '@towns/privy'
import uniqBy from 'lodash/uniqBy'
import { env } from 'utils'
import { ENVIRONMENTS, useEnvironment } from 'hooks/useEnvironmnet'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'

export const SUPPORTED_CHAINS = uniqBy(
    ENVIRONMENTS.map((env) => env.baseChain),
    (x) => x.id,
)

const logo = '/towns_privy.svg'

export function TownsPrivyProvider({ children }: { children: JSX.Element }) {
    const { baseChain: chain } = useEnvironment()
    const theme = useStore((s) => s.getTheme())

    return (
        <PrivyProvider
            appId={env.VITE_PRIVY_ID}
            clientId={env.VITE_PRIVY_CLIENT_ID}
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
                },
                // Order of login methods:
                // Google
                // X
                // Farcaster
                // Apple (can we hide behind a "more" link"?)
                // SMS (can we hide behind a "more" link"?)
                // Email (can we hide behind a "more" link"?)
                loginMethodsAndOrder: {
                    primary: ['google', 'twitter', 'farcaster'],
                    overflow: ['apple', 'sms', 'email'],
                },
            }}
        >
            {children}
        </PrivyProvider>
    )
}
