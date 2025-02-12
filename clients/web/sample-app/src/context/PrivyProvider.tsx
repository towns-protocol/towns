import React from 'react'
import { PrivyProvider as _PrivyProvider } from '@privy-io/react-auth'
import { PrivyProvider as TownsPrivyProvider } from '@towns/privy'
import uniqBy from 'lodash/uniqBy'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig } from '@privy-io/wagmi'
import { Chain, http } from 'viem'
import { useEnvironment } from 'hooks/use-environment'
import { ENVIRONMENTS } from 'utils/environment'

const PRIVY_ID = import.meta.env.VITE_PRIVY_ID ?? 'imustbe25charslong_______'

const SUPPORTED_CHAINS = uniqBy(
    ENVIRONMENTS.map((env) => env.baseChain),
    (x) => x.id,
)

const queryClient = new QueryClient()

const config = createConfig({
    chains: SUPPORTED_CHAINS as [Chain, ...Chain[]],
    transports: Object.fromEntries(SUPPORTED_CHAINS.map((chain) => [chain.id, http()])),
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
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={config}>{children}</WagmiProvider>
            </QueryClientProvider>
        </TownsPrivyProvider>
    ) : null
}
