/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react'
import { ZionOnboardingOpts } from '../../../src/client/ZionClientTypes'

import { TestQueryClientProvider } from './TestQueryClientProvider'
import { ZionContextProvider } from '../../../src/components/ZionContextProvider'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { foundry } from 'wagmi/chains'
// It's ok to useConnect in this case because <ZionTestApp /> is using WagmiConfig and not Privy
// eslint-disable-next-line no-restricted-imports
import { WagmiConfig, configureChains, createConfig, useConnect } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { useZionErrorStore } from '../../../src/hooks/use-zion-client'
import { publicProvider } from 'wagmi/providers/public'

interface Props {
    provider: ZionTestWeb3Provider
    onboardingOpts?: ZionOnboardingOpts
    initialSyncLimit?: number
    pollTimeoutMs?: number
    chainId?: number
    children: JSX.Element
}

const { chains, publicClient, webSocketPublicClient } = configureChains(
    [foundry],
    [publicProvider()],
)
const mockConfig = createConfig({
    connectors: [new InjectedConnector({ chains })],
    publicClient,
    webSocketPublicClient,
})

export const ZionTestApp = (props: Props) => {
    const {
        provider,
        onboardingOpts: inOnboardingOpts,
        initialSyncLimit,
        pollTimeoutMs,
        children,
    } = props
    // pull environment variables from the process
    const casablancaServerUrl = process.env.CASABLANCA_SERVER_URL!
    const onboardingOpts: ZionOnboardingOpts = inOnboardingOpts
        ? inOnboardingOpts
        : {
              showWelcomeSpash: true,
          }
    Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: true,
    })

    return (
        <WagmiConfig config={mockConfig}>
            <ZionContextProvider
                casablancaServerUrl={casablancaServerUrl}
                onboardingOpts={onboardingOpts}
                initialSyncLimit={initialSyncLimit}
                pollTimeoutMs={pollTimeoutMs}
                chainId={foundry.id}
                QueryClientProvider={TestQueryClientProvider}
                logNamespaceFilter="" // "csb:*" A bit too much for tests, better way to set?
                verbose={true}
            >
                <>
                    <ZionWalletAutoConnect />
                    {children}
                    <ZionErrors />
                </>
            </ZionContextProvider>
        </WagmiConfig>
    )
}

/// in the tests we make a custom provider that wraps our random wallet
/// go ahead and connect to the wallet automatically, so we don't have to do it in every test
const ZionWalletAutoConnect = () => {
    const { connect, connectors, error, status, data } = useConnect()
    const connected = useRef(false)
    // automatically connect to the wallet if it's available
    useEffect(() => {
        if (connectors.length > 0 && !connected.current) {
            connected.current = true
            console.log('ZionTestApp: connecting to wallet')
            connect({ connector: connectors[0] })
        }
    }, [connect, connectors])
    // log state
    useEffect(() => {
        console.log('ZionTestApp: wallet connection status', {
            error,
            status,
            data,
        })
    }, [error, status, data])
    return <>{error && `WalletAutoConnect Error: ${JSON.stringify(error)}`}</>
}

const ZionErrors = () => {
    const { errors } = useZionErrorStore()
    return (
        <div data-testid="captured-errors">
            {errors.map((e, i) => (
                <div key={i}>{e}</div>
            ))}
        </div>
    )
}
