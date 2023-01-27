import React, { createContext, useContext, useRef } from 'react'
import { useWeb3 } from '../hooks/Web3Context/useWeb3'
import { WagmiConfig, createClient, configureChains, Chain, Address } from 'wagmi'
import { goerli, localhost, foundry } from '@wagmi/core/chains'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { TProvider, WalletStatus } from '../types/web3-types'
import { alchemyProvider } from 'wagmi/providers/alchemy'

export interface IWeb3Context {
    provider?: TProvider
    sign: (message: string, walletAddress: string) => Promise<string | undefined>
    accounts: Address[]
    chain?: Chain & {
        unsupported?: boolean
    }
    chains: Chain[]
    isConnected: boolean
    walletStatus: WalletStatus
}

export const Web3Context = createContext<IWeb3Context | undefined>(undefined)

export function useWeb3Context(): IWeb3Context {
    const context = useContext(Web3Context)
    if (!context) {
        throw new Error('useWeb3Context must be used in a Web3ContextProvider')
    }
    return context
}

interface Props {
    children: JSX.Element
    chain?: Chain
    alchemyKey?: string
}

export function Web3ContextProvider(props: Props): JSX.Element {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wagmiClient = useRef<any>()

    if (!wagmiClient.current) {
        const providers = [publicProvider({ priority: 1 })]

        if (props.alchemyKey) {
            providers.push(alchemyProvider({ apiKey: props.alchemyKey, priority: 0 }))
        }

        const { chains, provider, webSocketProvider } = configureChains(
            [goerli, localhost, foundry],
            providers,
        )
        const client = createClient({
            autoConnect: true,
            connectors: [new InjectedConnector({ chains })],
            provider,
            webSocketProvider,
        })
        wagmiClient.current = client
    }
    return (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        <WagmiConfig client={wagmiClient.current}>
            <ContextImpl {...props} />
        </WagmiConfig>
    )
}

export function ContextImpl(props: Props): JSX.Element {
    const web3 = useWeb3(props.chain)
    return <Web3Context.Provider value={web3}>{props.children}</Web3Context.Provider>
}
