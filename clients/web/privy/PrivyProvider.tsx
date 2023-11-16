import React from 'react'
import { configureChains } from 'wagmi'
import { PrivyProviderProps, PrivyProvider as _PrivyProvider } from '@privy-io/react-auth'
import { PrivyWagmiConnector } from '@privy-io/wagmi-connector'

type Props = {
    children: JSX.Element
    wagmiChainsConfig: ReturnType<typeof configureChains>
} & Omit<PrivyProviderProps, 'children'>

export function PrivyProvider({ children, wagmiChainsConfig, ...providerProps }: Props) {
    return (
        <_PrivyProvider {...providerProps}>
            <PrivyWagmiConnector wagmiChainsConfig={wagmiChainsConfig}>
                {children}
            </PrivyWagmiConnector>
        </_PrivyProvider>
    )
}
