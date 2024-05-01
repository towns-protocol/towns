import React, { createContext, useContext } from 'react'
import { EmbeddedSignerContextProvider, PrivyProvider as TownsPrivyProvider } from '@towns/privy'
import uniqBy from 'lodash/uniqBy'
import { env } from 'utils'
import { ENVIRONMENTS, useEnvironment } from 'hooks/useEnvironmnet'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'
import { CombinedAuthContextProvider } from './useCombinedAuth'
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

const logo = '/towns_privy.svg'

function PrivyProvider({ children }: { children: JSX.Element }) {
    const { baseChain: chain } = useEnvironment()
    const theme = useStore((s) => s.getTheme())

    return (
        <TownsPrivyProvider
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

const AncestorContext = createContext<boolean>(false)

function useAncestorContext() {
    return useContext(AncestorContext)
}

/**
 * This compoenent should wrap components that require Privy: logging in or making transactions.
 * Every time this provider is used, it will load the privy sdk.
 * When using this component, try to put it as high up in the component tree as possible.
 * And try to reduce renders of this component as much as possible. Consider wrapping the consuming component in React.memo.
 */
export function PrivyWrapper({ children }: { children: JSX.Element }) {
    const hasAncestorContext = useAncestorContext()
    const environment = useEnvironment()

    // If the parent is already a PrivyProvider, we don't need to wrap it again
    if (hasAncestorContext) {
        console.warn('PrivyWrapper is being used inside another PrivyWrapper')
        return <>{children}</>
    }

    return (
        <AncestorContext.Provider value>
            <PrivyProvider>
                <EmbeddedSignerContextProvider chainId={environment.baseChain.id}>
                    <CombinedAuthContextProvider>{children}</CombinedAuthContextProvider>
                </EmbeddedSignerContextProvider>
            </PrivyProvider>
        </AncestorContext.Provider>
    )
}
