import React from 'react'
import { ZionOnboardingOpts } from '../../../src/client/ZionClientTypes'

import { TestQueryClientProvider } from './TestQueryClientProvider'
import { ZionContextProvider } from '../../../src/components/ZionContextProvider'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { foundry } from 'viem/chains'
import { useZionErrorStore } from '../../../src/hooks/use-zion-client'

interface Props {
    provider: ZionTestWeb3Provider
    onboardingOpts?: ZionOnboardingOpts
    initialSyncLimit?: number
    pollTimeoutMs?: number
    chainId?: number
    children: JSX.Element
}

export const ZionTestApp = (props: Props) => {
    const { provider, children } = props
    // pull environment variables from the process
    const casablancaServerUrl = process.env.CASABLANCA_SERVER_URL!
    Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: true,
    })

    return (
        <ZionContextProvider
            casablancaServerUrl={casablancaServerUrl}
            chain={foundry}
            QueryClientProvider={TestQueryClientProvider}
        >
            <>
                {children}
                <ZionErrors />
            </>
        </ZionContextProvider>
    )
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
