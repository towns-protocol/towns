import React from 'react'

import { TestQueryClientProvider } from './TestQueryClientProvider'
import { TownsContextProvider } from '../../../src/components/TownsContextProvider'
import { TownsTestWeb3Provider } from './TownsTestWeb3Provider'
import { foundry } from 'viem/chains'
import { useTownsErrorStore } from '../../../src/hooks/use-towns-client'
import { IChainConfig } from '../../../src/types/web3-types'
import { Chain } from 'viem'

interface Props {
    provider: TownsTestWeb3Provider
    chainId?: number
    children: JSX.Element
}

export const TownsTestApp = (props: Props) => {
    const { provider, children } = props
    // pull environment variables from the process
    const environmentId = process.env.RIVER_ENV!

    const riverChain = {
        rpcUrl: provider.config.river.rpcUrl,
        name: 'river_chain',
        chainId: provider.config.river.chainConfig.chainId,
    } satisfies IChainConfig
    Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: true,
    })
    const baseChain = {
        id: provider.config.base.chainConfig.chainId,
        name: 'base_chain',
        network: 'base_chain_network',
        nativeCurrency: foundry.nativeCurrency,
        rpcUrls: {
            default: { http: [provider.config.base.rpcUrl] },
            public: { http: [provider.config.base.rpcUrl] },
        },
    } satisfies Chain

    return (
        <TownsContextProvider
            environmentId={environmentId}
            baseChain={baseChain}
            baseConfig={provider.config.base.chainConfig}
            riverChain={riverChain}
            riverConfig={provider.config.river.chainConfig}
            QueryClientProvider={TestQueryClientProvider}
            supportedXChainRpcMapping={{
                [foundry.id]: foundry.rpcUrls.default.http[0],
            }}
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
