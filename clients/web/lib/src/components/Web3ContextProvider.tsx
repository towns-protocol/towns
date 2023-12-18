import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { Chain, useAccount, useNetwork, usePublicClient } from 'wagmi'
import { TProvider } from '../types/web3-types'
import { useEthersProvider } from '../hooks/Web3Context/useEthersProvider'

export interface IWeb3Context {
    provider?: TProvider
    chain?: Chain & {
        unsupported?: boolean
    }
    chains: Chain[]
    isConnected: boolean
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
}

export function Web3ContextProvider(props: Props): JSX.Element {
    const { chainId } = props
    const publicClient = usePublicClient({ chainId })
    // wagmiConfig.chanins is not populated unless you are connected!
    // so use this for now
    const chain = publicClient.chains?.find((c) => c.id === props.chainId)

    if (!chain) {
        console.error('Unsupported chain for Towns', props.chainId)
    }
    const web3 = useWeb3({
        chainId,
        chain,
    })
    return <Web3Context.Provider value={web3}>{props.children}</Web3Context.Provider>
}

type Web3ContextOptions = {
    chain?: Chain
    chainId: number
}

/// web3 components, pass chain to lock to a specific chain, pass signer to override the default signer (usefull for tests)
function useWeb3({ chain }: Web3ContextOptions): IWeb3Context {
    const { isConnected } = useAccount()
    const { chain: walletChain, chains } = useNetwork()

    // allowing app to pass in chain allows to load on correct chain per env regardless of user wallet settings
    // they are able to login w/out swapping networks
    // we still need guards for transactions
    const activeChain = useMemo(() => chain || walletChain, [chain, walletChain])
    const provider = useEthersProvider({ chainId: activeChain?.id })

    useEffect(() => {
        console.log('use web3 ##', {
            activeChain,
            chains,
            rpc: activeChain?.rpcUrls,
            def: activeChain?.rpcUrls?.default,
        })
    }, [activeChain, chains])

    return useMemo(
        () => ({
            provider,
            chain: activeChain,
            chains: chains,
            isConnected: isConnected,
        }),
        [activeChain, chains, isConnected, provider],
    )
}
