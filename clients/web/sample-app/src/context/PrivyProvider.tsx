import React from 'react'
import { configureChains } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { PrivyProvider as _PrivyProvider } from '@privy-io/react-auth'
import { PrivyProvider as TownsPrivyProvider } from '@towns/privy'
import uniqBy from 'lodash/uniqBy'
import { useEnvironment } from 'hooks/use-environment'
import { ENVIRONMENTS } from 'utils/environment'

const PRIVY_ID = import.meta.env.VITE_PRIVY_ID ?? 'imustbe25charslong_______'

const SUPPORTED_CHAINS = uniqBy(
    ENVIRONMENTS.map((env) => env.baseChain),
    (x) => x.id,
)

// the chains are custom configured to include the rpcUrls we want to use, the publicProvider is a function that just checks null for us
export const wagmiChainsConfig = configureChains(SUPPORTED_CHAINS, [publicProvider()], {
    retryCount: 5,
})
export function PrivyProvider({ children }: { children: JSX.Element }) {
    const { baseChain: chain } = useEnvironment()

    return chain ? (
        <TownsPrivyProvider
            appId={PRIVY_ID}
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
