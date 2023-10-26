import { Chain, useAccount, useNetwork } from 'wagmi'
import { WalletStatus } from '../../types/web3-types'
import { useEffect, useMemo } from 'react'

import { IWeb3Context } from '../../components/Web3ContextProvider'
import { ethers } from 'ethers'
import { useEthersProvider } from './useEthersProvider'
import { useEthersSigner } from './useEthersSigner'

type Web3ContextOptions = {
    chain?: Chain
    web3Signer?: ethers.Signer
    chainId: number
}

/// web3 components, pass chain to lock to a specific chain, pass signer to override the default signer (usefull for tests)
export function useWeb3({ chain, chainId, web3Signer }: Web3ContextOptions): IWeb3Context {
    const { address: activeWalletAddress, connector, isConnected, status } = useAccount()
    const { chain: walletChain, chains } = useNetwork()
    const accounts = useMemo(
        () => (activeWalletAddress ? [activeWalletAddress] : []),
        [activeWalletAddress],
    )
    const signer = useAppSigner(chainId, web3Signer)

    // allowing app to pass in chain allows to load on correct chain per env regardless of user wallet settings
    // they are able to login w/out swapping networks
    // we still need guards for transactions
    const activeChain = useMemo(() => chain || walletChain, [chain, walletChain])
    const provider = useEthersProvider({ chainId: activeChain?.id })

    useEffect(() => {
        console.log('use web3 ##', {
            connector,
            activeWalletAddress,
            activeChain,
            chains,
            rpc: activeChain?.rpcUrls,
            def: activeChain?.rpcUrls?.default,
            status,
            signer,
        })
    }, [activeChain, activeWalletAddress, chains, connector, status, signer])

    return {
        provider,
        signer,
        activeWalletAddress,
        accounts,
        chain: activeChain,
        chains: chains,
        isConnected: isConnected,
        walletStatus: status as WalletStatus,
    }
}

function useAppSigner(appChainId: number, web3Signer?: ethers.Signer) {
    const wagmiSigner = useEthersSigner({
        chainId: appChainId,
    })
    if (web3Signer) {
        return web3Signer
    } else if (wagmiSigner) {
        return wagmiSigner
    }
    return undefined
}
