import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Address, Chain, useAccount, useNetwork, usePublicClient } from 'wagmi'
import { ethers } from 'ethers'
import { TProvider } from '../types/web3-types'
import { useEthersSigner } from '../hooks/Web3Context/useEthersSigner'
import { useEthersProvider } from '../hooks/Web3Context/useEthersProvider'

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
    setSigner: (signer: ethers.Signer) => void
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
}

export function Web3ContextProvider(props: Props): JSX.Element {
    const { chainId, web3Signer } = props
    const publicClient = usePublicClient({ chainId })
    // wagmiConfig.chanins is not populated unless you are connected!
    // so use this for now
    const chain = publicClient.chains?.find((c) => c.id === props.chainId)

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

type Web3ContextOptions = {
    chain?: Chain
    web3Signer?: ethers.Signer
    chainId: number
}

/// web3 components, pass chain to lock to a specific chain, pass signer to override the default signer (usefull for tests)
function useWeb3({ chain, chainId, web3Signer }: Web3ContextOptions): IWeb3Context {
    const { address: activeWalletAddress, isConnected } = useAccount()
    const { chain: walletChain, chains } = useNetwork()
    const accounts = useMemo(
        () => (activeWalletAddress ? [activeWalletAddress] : []),
        [activeWalletAddress],
    )
    const { signer, setSigner } = useAppSigner(chainId, web3Signer)

    // allowing app to pass in chain allows to load on correct chain per env regardless of user wallet settings
    // they are able to login w/out swapping networks
    // we still need guards for transactions
    const activeChain = useMemo(() => chain || walletChain, [chain, walletChain])
    const provider = useEthersProvider({ chainId: activeChain?.id })

    useEffect(() => {
        console.log('use web3 ##', {
            activeWalletAddress,
            activeChain,
            chains,
            rpc: activeChain?.rpcUrls,
            def: activeChain?.rpcUrls?.default,
            signer,
        })
    }, [activeChain, activeWalletAddress, chains, signer])

    return useMemo(
        () => ({
            provider,
            signer,
            activeWalletAddress,
            accounts,
            chain: activeChain,
            chains: chains,
            isConnected: isConnected,
            setSigner,
        }),
        [
            accounts,
            activeChain,
            activeWalletAddress,
            chains,
            isConnected,
            provider,
            setSigner,
            signer,
        ],
    )
}

// we need to set a signer only once, which should be automatic,
// but in case it's not, we allow the app to set it manually
function useAppSigner(appChainId: number, web3Signer?: ethers.Signer) {
    // default to passed web3 signer, if any
    const [signer, _setSigner] = useState<ethers.Signer | undefined>(web3Signer)
    const wagmiSigner = useEthersSigner({
        chainId: appChainId,
    })

    useEffect(() => {
        if (signer) {
            return
        }
        // web3Signer should be the same as wagmiSigner, so it shouldn't matter which one comes first, but we can add an equality check if needed
        if (web3Signer) {
            _setSigner(web3Signer)
        } else if (wagmiSigner) {
            _setSigner(wagmiSigner)
        }
    }, [signer, web3Signer, wagmiSigner])

    // but there might be cases where a wallet is set after this hook is called, and for some unknown reason the wagmiSigner is not updated properly
    // in this case, the app can set the signer manually
    const setSigner = useCallback((signerInput: ethers.Signer) => {
        _setSigner(signerInput)
    }, [])

    return { signer, setSigner }
}

export function useWalletStatus() {
    return useAccount().status
}
