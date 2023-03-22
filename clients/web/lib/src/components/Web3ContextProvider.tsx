import React, { createContext, useContext, useRef } from 'react'
import { useWeb3 } from '../hooks/Web3Context/useWeb3'
import { WagmiConfig, createClient, configureChains, Chain, Address } from 'wagmi'
import { goerli, localhost, foundry, sepolia } from '@wagmi/core/chains'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { TProvider, WalletStatus } from '../types/web3-types'
import { alchemyProvider } from 'wagmi/providers/alchemy'

export interface IWeb3Context {
    provider?: TProvider
    sign: (message: string, walletAddress: string) => Promise<string | undefined>
    accounts: Address[]
    activeWalletAddress: Address | undefined
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
        // Note re. transactions 1.27.23
        // On local dev, if you load the app on unsupported chain i.e sepolia, then switch to supported chain, you will get an error when trying to make a transaction, that currently is only solved by refreshing the page.
        // https://github.com/ethers-io/ethers.js/issues/1107
        // https://github.com/ethers-io/ethers.js/issues/866
        // This seems to be caused by the chains/provider being configured here. If you only configure "foundry" you can't reproduce the issue
        // And on the live site, you can only reproduce the issue if you load with localhost network and then switch to goerli
        // This indicates the provider is being swapped between public & alchemy during these network changes, so we may need to fine tune this in the future or handle it otherwise if real users experience it
        // Since this also seems to be just on metamask, ignoring for now
        const { chains, provider, webSocketProvider } = configureChains(
            [goerli, localhost, foundry, sepolia],
            props.alchemyKey
                ? [
                      alchemyProvider({ apiKey: props.alchemyKey, priority: 0 }),
                      publicProvider({ priority: 1 }),
                  ]
                : [publicProvider()],
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
