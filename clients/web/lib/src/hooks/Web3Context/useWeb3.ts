import {
    Address,
    Chain,
    ConnectorData,
    useAccount,
    useNetwork,
    useProvider,
    useSigner,
} from 'wagmi'
import { WalletStatus, isNullAddress } from '../../types/web3-types'
import { useEffect, useMemo, useState } from 'react'

import { Ethereum } from '@wagmi/core'
import { IWeb3Context } from '../../components/Web3ContextProvider'
import { ethers } from 'ethers'

/// web3 components, pass chain to lock to a specific chain, pass signer to override the default signer (usefull for tests)
export function useWeb3(chainId: number, chain?: Chain, web3Signer?: ethers.Signer): IWeb3Context {
    const { address, connector, isConnected, status } = useAccount()
    const { chain: walletChain, chains } = useNetwork()
    const [activeWalletAddressOverride, setActiveWalletAddressOverride] = useState<
        { account: Address | undefined } | undefined
    >(undefined)
    const activeWalletAddress = activeWalletAddressOverride
        ? activeWalletAddressOverride.account
        : address
    const accounts = useMemo(
        () => (activeWalletAddress ? [activeWalletAddress] : []),
        [activeWalletAddress],
    )
    const signer = useAppSigner(chainId, web3Signer)

    // allowing app to pass in chain allows to load on correct chain per env regardless of user wallet settings
    // they are able to login w/out swapping networks
    // we still need guards for transactions
    const activeChain = useMemo(() => chain || walletChain, [chain, walletChain])
    const provider = useProvider({ chainId: activeChain?.id })

    // hook up accountChanged event handler to the connector
    useEffect(() => {
        const onChange = (data: ConnectorData<Ethereum | undefined>) => {
            let activeAccount: Address | undefined
            if (data.account && !isNullAddress(data.account)) {
                // the first account is the active one
                // also check that this is not the NULL_ADDRESS
                // before setting the activeWalletAddress
                activeAccount = data.account
            }
            setActiveWalletAddressOverride(activeAccount ? { account: activeAccount } : undefined)
            console.log('useWeb3', 'onChange', data)
        }
        const onDisconnect = () => {
            console.log('useWeb3', 'onDisconnect')
            setActiveWalletAddressOverride({ account: undefined })
        }

        if (connector) {
            // our custom injector connector emits the message event whenever
            // the accounts change.
            // listen for the event and call onMessage
            console.log('adding event listener')
            connector.on('change', onChange)
            connector.on('disconnect', onDisconnect)
        }

        return () => {
            console.log('removing event listener')
            connector?.off('change', onChange)
            connector?.off('disconnect', onDisconnect)
        }
    }, [connector])

    useEffect(() => {
        console.log('use web3 ##', {
            connector,
            address,
            activeWalletAddress,
            activeWalletAddressOverride,
            activeChain,
            chains,
            rpc: activeChain?.rpcUrls,
            def: activeChain?.rpcUrls?.default,
            status,
        })
    }, [
        activeChain,
        activeWalletAddress,
        activeWalletAddressOverride,
        address,
        chains,
        connector,
        status,
    ])

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
    const { data: wagmiSigner } = useSigner({
        chainId: appChainId,
    })
    if (web3Signer) {
        return web3Signer
    } else if (wagmiSigner) {
        return wagmiSigner
    }
    return undefined
}
