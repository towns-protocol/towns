import React, { createContext, useContext, useRef } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../hooks/Web3Context/useWeb3'
import { WagmiConfig, createClient, configureChains, chain, Chain } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletStatus } from '../types/web3-types'

export interface IWeb3Context {
    provider?: ethers.providers.Web3Provider
    sign: (message: string, walletAddress: string) => Promise<string | undefined>
    accounts: string[]
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
}

export function Web3ContextProvider(props: Props): JSX.Element {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wagmiClient = useRef<any>()
    if (!wagmiClient.current) {
        const { chains, provider, webSocketProvider } = configureChains(
            [chain.goerli, chain.foundry, chain.localhost],
            [publicProvider()], // todo, add more providers see: https://github.com/HereNotThere/harmony/issues/460
        )
        const client = createClient({
            autoConnect: true,
            connectors: [new MetaMaskConnector({ chains })],
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
    const web3 = useWeb3()
    return <Web3Context.Provider value={web3}>{props.children}</Web3Context.Provider>
}
