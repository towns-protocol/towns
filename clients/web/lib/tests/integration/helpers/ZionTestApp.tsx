/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react'
import { SpaceProtocol, ZionOnboardingOpts } from '../../../src/client/ZionClientTypes'

import { TestQueryClientProvider } from './TestQueryClientProvider'
import { ZionContextProvider } from '../../../src/components/ZionContextProvider'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { foundry } from 'wagmi/chains'
import { useConnect } from 'wagmi'
import { getPrimaryProtocol } from './TestUtils'
import { useZionErrorStore } from '../../../src/hooks/use-zion-client'

interface Props {
    provider: ZionTestWeb3Provider
    primaryProtocol?: SpaceProtocol
    onboardingOpts?: ZionOnboardingOpts
    initialSyncLimit?: number
    pollTimeoutMs?: number
    chainId?: number
    children: JSX.Element
}

export const ZionTestApp = (props: Props) => {
    const {
        provider,
        primaryProtocol: inPrimaryProtocol,
        onboardingOpts: inOnboardingOpts,
        initialSyncLimit,
        pollTimeoutMs,
        children,
    } = props
    // pull environment variables from the process
    const primaryProtocol = inPrimaryProtocol ?? getPrimaryProtocol()
    const homeServerUrl = process.env.HOMESERVER!
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
        <ZionContextProvider
            primaryProtocol={primaryProtocol}
            matrixServerUrl={homeServerUrl}
            casablancaServerUrl={casablancaServerUrl}
            onboardingOpts={onboardingOpts}
            initialSyncLimit={initialSyncLimit}
            pollTimeoutMs={pollTimeoutMs}
            chainId={foundry.id}
            QueryClientProvider={TestQueryClientProvider}
            logNamespaceFilter="" // "csb:*" A bit too much for tests, better way to set?
            web3Signer={provider.wallet}
            verbose={true}
        >
            <>
                <ZionWalletAutoConnect />
                {children}
                <ZionErrors />
            </>
        </ZionContextProvider>
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
