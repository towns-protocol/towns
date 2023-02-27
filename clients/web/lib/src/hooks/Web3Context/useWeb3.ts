import { useCallback, useEffect, useMemo } from 'react'
import { useAccount, useNetwork, useSignMessage, Chain, useProvider } from 'wagmi'
import { IWeb3Context } from '../../components/Web3ContextProvider'
import { WalletStatus } from '../../types/web3-types'

/// web3 grabs some of the wagmi data for convience, please feel free to use wagmi directly
export function useWeb3(chain?: Chain): IWeb3Context {
    const { address, connector, isConnected, status } = useAccount()
    const { chain: walletChain, chains } = useNetwork()
    const { signMessageAsync } = useSignMessage()

    // allowing app to pass in chain allows to load on correct chain per env regardless of user wallet settings
    // they are able to login w/out swapping networks
    // we still need guards for transactions
    const activeChain = useMemo(() => chain || walletChain, [chain, walletChain])
    const provider = useProvider({ chainId: activeChain?.id })
    const accounts = useMemo(() => (address ? [address] : []), [address])

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
            activeChain,
            chains,
            rpc: activeChain?.rpcUrls,
            def: activeChain?.rpcUrls?.default,
            status,
        })
    }, [activeChain, address, chains, connector, status])

    return {
        provider,
        sign: sign,
        activeWalletAddress: address,
        accounts,
        chain: activeChain,
        chains: chains,
        isConnected: isConnected,
        walletStatus: status as WalletStatus,
    }
}
