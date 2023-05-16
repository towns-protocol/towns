import { Address, Chain, WagmiConfig, configureChains, createClient } from 'wagmi'
import React, { createContext, useContext, useMemo } from 'react'
import { TProvider, WalletStatus } from '../types/web3-types'
import { foundry, goerli, localhost, sepolia } from '@wagmi/core/chains'

import { InjectedConnector } from '@wagmi/connectors/injected'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { ethers } from 'ethers'
import { publicProvider } from 'wagmi/providers/public'
import { useWeb3 } from '../hooks/Web3Context/useWeb3'

export interface IWeb3Context {
    provider?: TProvider
    signer: ethers.Signer | undefined
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
    web3Signer?: ethers.Signer // sometimes, like during testing, it makes sense to inject a signer
}

const SUPPORTED_CHAINS = [goerli, localhost, foundry, sepolia]

export function Web3ContextProvider(props: Props): JSX.Element {
    // Note: this is a hack to get the provider to be created only once
    // If the useMemo is not here, the provider would be created on every render
    // If the memo ever discards the state, the provider will be recreated
    // and the user will be disconnected from the wallet which is not too bad
    const client = useMemo(() => {
        const { chains, provider, webSocketProvider } = configureChains(
            SUPPORTED_CHAINS,
            props.alchemyKey
                ? [
                      alchemyProvider({ apiKey: props.alchemyKey, priority: 0 }),
                      publicProvider({ priority: 1 }),
                  ]
                : [publicProvider()],
        )
        return createClient({
            autoConnect: true,
            connectors: [new InjectedConnector({ chains })],
            provider,
            webSocketProvider,
        })
    }, [props.alchemyKey])

    return (
        <WagmiConfig client={client}>
            <ContextImpl {...props} />
        </WagmiConfig>
    )
}

export function ContextImpl(props: Props): JSX.Element {
    const chain = SUPPORTED_CHAINS.find((c) => c.id === props.chainId)
    if (!chain) {
        console.error('Unsupported chain for Towns', props.chainId)
    }
    const web3 = useWeb3(props.chainId, chain, props.web3Signer)
    return <Web3Context.Provider value={web3}>{props.children}</Web3Context.Provider>
}
