import React, { useMemo } from 'react'
import { baseGoerli, foundry, goerli, localhost, sepolia } from 'wagmi/chains'
import { configureChains } from 'wagmi'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { PrivyProvider as _PrivyProvider } from '@privy-io/react-auth'
import { PrivyWagmiConnector } from '@privy-io/wagmi-connector'
import { useEnvironment } from 'hooks/use-environment'
import { ENVIRONMENTS } from 'utils/environment'

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY ?? ''
const PRIVY_ID = import.meta.env.VITE_PRIVY_ID ?? ''

const SUPPORTED_CHAINS = [goerli, sepolia, foundry, baseGoerli, localhost]

const configureChainsConfig = configureChains(
    SUPPORTED_CHAINS,
    ALCHEMY_KEY ? [alchemyProvider({ apiKey: ALCHEMY_KEY }), publicProvider()] : [publicProvider()],
    { retryCount: 5 },
)

export function PrivyProvider({ children }: { children: JSX.Element }) {
    const { chainId } = useEnvironment()

    const chain = useMemo(() => {
        return ENVIRONMENTS.find((e) => e.chainId === chainId)?.chain
    }, [chainId])

    return chain ? (
        <_PrivyProvider
            appId={PRIVY_ID}
            config={{
                embeddedWallets: {
                    createOnLogin: 'all-users',
                    noPromptOnSignature: true,
                },
                loginMethods: ['sms', 'google', 'twitter', 'apple'],
                // the primary network the app uses
                // privy will init to this network such as when logging in and creating an embedded wallet
                defaultChain: chain,
                // networks that wallets are permitted to use in the app
                // this is really only b/c we develop locally against both local and deployed nodes
                // TODO: in production we could narrow this to only the defaultChain
                supportedChains: SUPPORTED_CHAINS,
            }}
            // onSuccess={handleLogin}
        >
            <PrivyWagmiConnector wagmiChainsConfig={configureChainsConfig}>
                {children}
            </PrivyWagmiConnector>
        </_PrivyProvider>
    ) : null
}
