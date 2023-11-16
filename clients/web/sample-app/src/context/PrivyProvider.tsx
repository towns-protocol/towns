import React, { useMemo } from 'react'
import { baseGoerli, foundry, goerli, localhost, sepolia } from 'wagmi/chains'
import { configureChains } from 'wagmi'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { PrivyProvider as _PrivyProvider } from '@privy-io/react-auth'
import { PrivyProvider as TownsPrivyProvider } from '@towns/privy'
import { useEnvironment } from 'hooks/use-environment'
import { ENVIRONMENTS } from 'utils/environment'

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY ?? ''
const PRIVY_ID = import.meta.env.VITE_PRIVY_ID ?? ''

const SUPPORTED_CHAINS = [goerli, sepolia, foundry, baseGoerli, localhost]

const wagmiChainsConfig = configureChains(
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
        <TownsPrivyProvider
            appId={PRIVY_ID}
            wagmiChainsConfig={wagmiChainsConfig}
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
