import React from 'react'

import { TestQueryClientProvider } from './TestQueryClientProvider'
import { TownsContextProvider } from '../../../src/components/TownsContextProvider'
import { TownsTestWeb3Provider } from './TownsTestWeb3Provider'
import { foundry } from 'viem/chains'
import { useTownsErrorStore } from '../../../src/hooks/use-towns-client'

interface Props {
    provider: TownsTestWeb3Provider
    initialSyncLimit?: number
    pollTimeoutMs?: number
    chainId?: number
    children: JSX.Element
}

export const TownsTestApp = (props: Props) => {
    const { provider, children } = props
    // pull environment variables from the process
    const casablancaServerUrl = process.env.CASABLANCA_SERVER_URL!
    Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: true,
    })

    return (
        <TownsContextProvider
            casablancaServerUrl={casablancaServerUrl}
            chain={foundry}
            QueryClientProvider={TestQueryClientProvider}
        >
            <>
                {children}
                <TownsErrors />
            </>
        </TownsContextProvider>
    )
}

const TownsErrors = () => {
    const { errors } = useTownsErrorStore()
    return (
        <div data-testid="captured-errors">
            {errors.map((e, i) => (
                <div key={i}>{e}</div>
            ))}
        </div>
    )
}
