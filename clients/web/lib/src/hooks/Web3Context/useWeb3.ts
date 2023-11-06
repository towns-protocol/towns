import { Chain, useAccount, useNetwork } from 'wagmi'
import { WalletStatus } from '../../types/web3-types'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
    const { signer, setSigner } = useAppSigner(chainId, web3Signer)

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

    return useMemo(
        () => ({
            provider,
            signer,
            activeWalletAddress,
            accounts,
            chain: activeChain,
            chains: chains,
            isConnected: isConnected,
            walletStatus: status as WalletStatus,
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
            status,
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
