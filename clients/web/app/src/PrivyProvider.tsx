import React, { useMemo } from 'react'
import { configureChains } from 'wagmi'
import { baseGoerli, localhost } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { PrivyProvider as _PrivyProvider } from '@privy-io/react-auth'
import { PrivyWagmiConnector } from '@privy-io/wagmi-connector'
import { env } from 'utils'
import { ENVIRONMENTS, useEnvironment } from 'hooks/useEnvironmnet'
import { foundryClone } from 'foundryChain'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'

if (env.VITE_CF_TUNNEL_PREFIX) {
    const rpcUrl = `https://${env.VITE_CF_TUNNEL_PREFIX}-anvil.towns.com`
    foundryClone.rpcUrls = {
        default: {
            http: [rpcUrl],
        },
        public: {
            http: [rpcUrl],
        },
    }
}

const SUPPORTED_CHAINS = [foundryClone, baseGoerli, localhost]

const configureChainsConfig = configureChains(
    SUPPORTED_CHAINS,
    env.VITE_ALCHEMY_API_KEY
        ? [alchemyProvider({ apiKey: env.VITE_ALCHEMY_API_KEY }), publicProvider()]
        : [publicProvider()],
    { retryCount: 5 },
)

export function PrivyProvider({ children }: { children: JSX.Element }) {
    const { chainId } = useEnvironment()
    const theme = useStore((s) => s.theme)

    const chain = useMemo(() => {
        return ENVIRONMENTS.find((e) => e.chainId === chainId)?.chain
    }, [chainId])

    return chain ? (
        <_PrivyProvider
            appId={env.VITE_PRIVY_ID}
            config={{
                embeddedWallets: {
                    createOnLogin: 'all-users',
                    noPromptOnSignature: true,
                },
                loginMethods: ['sms', 'google', 'twitter', 'apple'],
                appearance: {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    theme: theme === 'dark' ? Figma.DarkMode.Level2 : Figma.LightMode.Level1,
                    accentColor: Figma.Colors.Blue,
                    logo: '/towns_privy.svg',
                },
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
