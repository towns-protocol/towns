import { Address, Chain, Config, PublicClient, WagmiConfig, WebSocketPublicClient } from 'wagmi'
import React, { createContext, useContext } from 'react'
import { TProvider, WalletStatus } from '../types/web3-types'
import { ethers } from 'ethers'
import { useWeb3 } from '../hooks/Web3Context/useWeb3'
import { FallbackTransport } from 'viem'

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
    web3Signer?: ethers.Signer // sometimes, like during testing, it makes sense to inject a signer
    wagmiConfig: Config<PublicClient<FallbackTransport>, WebSocketPublicClient<FallbackTransport>>
}

export function Web3ContextProvider(props: Props): JSX.Element {
    return (
        <WagmiConfig config={props.wagmiConfig}>
            <ContextImpl {...props} />
        </WagmiConfig>
    )
}

export function ContextImpl(props: Props): JSX.Element {
    const { chainId, web3Signer, wagmiConfig } = props
    // wagmiConfig.chanins is not populated unless you are connected!
    // so use this for now
    const chain = wagmiConfig.publicClient.chains?.find((c) => c.id === props.chainId)

    if (!chain) {
        console.error('Unsupported chain for Towns', props.chainId)
    }
    const web3 = useWeb3({
        chainId,
        web3Signer,
        chain,
    })
    return <Web3Context.Provider value={web3}>{props.children}</Web3Context.Provider>
}
