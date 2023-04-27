import { Address, Chain, WagmiConfig, configureChains, createClient } from 'wagmi'
import React, { createContext, useContext, useRef } from 'react'
import { TProvider, WalletStatus } from '../types/web3-types'
import { foundry, goerli, localhost, sepolia } from '@wagmi/core/chains'

import { CustomInjectedConnector } from './CustomInjectedConnector'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { useWeb3 } from '../hooks/Web3Context/useWeb3'

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
    chainId: number
    alchemyKey?: string
}

const SUPPORTED_CHAINS = [goerli, localhost, foundry, sepolia]

export function Web3ContextProvider(props: Props): JSX.Element {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wagmiClient = useRef<any>()

    if (!wagmiClient.current) {
        const { chains, provider, webSocketProvider } = configureChains(
            SUPPORTED_CHAINS,
            props.alchemyKey
                ? [
                      alchemyProvider({ apiKey: props.alchemyKey, priority: 0 }),
                      publicProvider({ priority: 1 }),
                  ]
                : [publicProvider()],
        )
        const client = createClient({
            autoConnect: true,
            connectors: [new CustomInjectedConnector({ chains })],
            // cannot use the default InjectedConnector. Disconnecting the last
            // connected wallet will kick the user out of the app. This is
            // because it triggers the disconnected event.
            //connectors: [new InjectedConnector({ chains })],
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
    const chain = SUPPORTED_CHAINS.find((c) => c.id === props.chainId)
    if (!chain) {
        console.error('Unsupported chain for Towns', props.chainId)
    }
    const web3 = useWeb3(chain)
    return <Web3Context.Provider value={web3}>{props.children}</Web3Context.Provider>
}
