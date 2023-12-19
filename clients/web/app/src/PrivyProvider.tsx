import React, { useMemo } from 'react'
import { configureChains } from 'wagmi'
import { baseGoerli, baseSepolia, localhost } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { PrivyProvider as TownsPrivyProvider } from '@towns/privy'
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

const SUPPORTED_CHAINS = [foundryClone, baseGoerli, baseSepolia, localhost]

const wagmiChainsConfig = configureChains(
    SUPPORTED_CHAINS,
    env.VITE_ALCHEMY_API_KEY
        ? [alchemyProvider({ apiKey: env.VITE_ALCHEMY_API_KEY }), publicProvider()]
        : [publicProvider()],
    { retryCount: 5 },
)

const logo = '/towns_privy.svg'

export function PrivyProvider({ children }: { children: JSX.Element }) {
    const { chainId } = useEnvironment()
    const theme = useStore((s) => s.theme)

    const chain = useMemo(() => {
        return ENVIRONMENTS.find((e) => e.chainId === chainId)?.chain
    }, [chainId])

    return chain ? (
        <TownsPrivyProvider
            wagmiChainsConfig={wagmiChainsConfig}
            appId={env.VITE_PRIVY_ID}
            config={{
                defaultChain: chain,
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
    ) : null
}
