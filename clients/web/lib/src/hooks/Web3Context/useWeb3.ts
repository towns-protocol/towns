import {
    Address,
    Chain,
    ConnectorData,
    useAccount,
    useNetwork,
    useProvider,
    useSignMessage,
} from 'wagmi'
import { WalletStatus, isNullAddress } from '../../types/web3-types'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Ethereum } from '@wagmi/core'
import { IWeb3Context } from '../../components/Web3ContextProvider'

/// web3 grabs some of the wagmi data for convience, please feel free to use wagmi directly
export function useWeb3(chain?: Chain): IWeb3Context {
    const { address, connector, isConnected, status } = useAccount()
    const { chain: walletChain, chains } = useNetwork()
    const { signMessageAsync } = useSignMessage()
    const [activeWalletAddressOverride, setActiveWalletAddressOverride] = useState<
        { address: Address | undefined } | undefined
    >()
    const [accounts, setAccounts] = useState<Address[]>(address ? [address] : [])

    // allowing app to pass in chain allows to load on correct chain per env regardless of user wallet settings
    // they are able to login w/out swapping networks
    // we still need guards for transactions
    const activeChain = useMemo(() => chain || walletChain, [chain, walletChain])
    const provider = useProvider({ chainId: activeChain?.id })

    // hook up accountChanged event handler to the connector
    useEffect(() => {
        const onChange = (data: ConnectorData<Ethereum | undefined>) => {
            let accounts: Address[] = []
            let activeAccount: Address | undefined
            if (data.account && !isNullAddress(data.account)) {
                // the first account is the active one
                // also check that this is not the NULL_ADDRESS
                // before setting the activeWalletAddress
                accounts = [data.account] as Address[]
                activeAccount = data.account
            }
            setAccounts(accounts)
            setActiveWalletAddressOverride({ address: activeAccount })
            console.log('useWeb3', 'onChange', data, accounts)
        }
        const onDisconnect = () => {
            console.log('useWeb3', 'onDisconnect')
            setAccounts([])
            setActiveWalletAddressOverride({ address: undefined })
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

    const sign = useCallback(
        async (message: string): Promise<string | undefined> => {
            return signMessageAsync({ message })
        },
        [signMessageAsync],
    )

    useEffect(() => {
        console.log('use web3', {
            connector,
            address,
            activeWalletAddressOverride,
            activeChain,
            chains,
            rpc: activeChain?.rpcUrls,
            def: activeChain?.rpcUrls?.default,
            status,
        })
    }, [activeChain, activeWalletAddressOverride, address, chains, connector, status])

    return {
        provider,
        sign: sign,
        activeWalletAddress: activeWalletAddressOverride
            ? activeWalletAddressOverride.address
            : address,
        accounts,
        chain: activeChain,
        chains: chains,
        isConnected: isConnected,
        walletStatus: status as WalletStatus,
    }
}
