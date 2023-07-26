import { Address, Chain, WagmiConfig, configureChains, createConfig } from 'wagmi'
import React, { createContext, useContext, useMemo } from 'react'
import { Connectors, TProvider, WalletStatus } from '../types/web3-types'
import { foundry, goerli, localhost, sepolia } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { ethers } from 'ethers'
import { publicProvider } from 'wagmi/providers/public'
import { useWeb3 } from '../hooks/Web3Context/useWeb3'
import { InjectedConnector } from 'wagmi/connectors/injected'

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
    connectors?: Connectors // optional connectors to use instead of the default injected connector
}

const SUPPORTED_CHAINS = [goerli, localhost, foundry, sepolia]
export type SupportedChains = (typeof SUPPORTED_CHAINS)[number]

export function Web3ContextProvider(props: Props): JSX.Element {
    const { alchemyKey, connectors } = props
    // Note: this is a hack to get the provider to be created only once
    // If the useMemo is not here, the provider would be created on every render
    // If the memo ever discards the state, the provider will be recreated
    // and the user will be disconnected from the wallet which is not too bad

    const { config } = useMemo(() => {
        const { chains, publicClient, webSocketPublicClient } = configureChains(
            SUPPORTED_CHAINS,
            alchemyKey
                ? [alchemyProvider({ apiKey: alchemyKey }), publicProvider()]
                : [publicProvider()],
            { retryCount: 5 },
        )

        const config = createConfig({
            autoConnect: true,
            connectors: connectors?.({ chains }) ?? [new InjectedConnector({ chains })],
            publicClient,
            webSocketPublicClient,
        })

        return { config }
    }, [alchemyKey, connectors])

    return (
        <WagmiConfig config={config}>
            <ContextImpl {...props} />
        </WagmiConfig>
    )
}

export function ContextImpl(props: Props): JSX.Element {
    const { chainId, web3Signer, alchemyKey } = props
    const chain = SUPPORTED_CHAINS.find((c) => c.id === props.chainId)
    if (!chain) {
        console.error('Unsupported chain for Towns', props.chainId)
    }
    const web3 = useWeb3({
        chainId,
        web3Signer,
        alchemyKey,
        chain,
    })
    return <Web3Context.Provider value={web3}>{props.children}</Web3Context.Provider>
}
