import { useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import { useAccount, useNetwork, useSignMessage, Chain } from 'wagmi'
import { IWeb3Context } from '../../components/Web3ContextProvider'
import { WalletStatus } from '../../types/web3-types'

interface IWeb3ProviderWrapper {
    provider: ethers.providers.Web3Provider
    chainId?: number
}

/// web3 grabs some of the wagmi data for convience, please feel free to use wagmi directly
export function useWeb3(chain?: Chain): IWeb3Context {
    const { address, connector, isConnected, status } = useAccount()
    const { chain: walletChain, chains } = useNetwork()
    const { signMessageAsync } = useSignMessage()

    const provider = useRef<IWeb3ProviderWrapper>()

    // allowing app to pass in chain allows to load on correct chain per env regardless of user wallet settings
    // they are able to login w/out swapping networks
    // we still need guards for transactions
    const activeChain = chain || walletChain

    /// aellis 10.19.2022 note, we use wagmi for nearly everything,
    /// but we use the window.ethereum object for instanciating the contracts
    /// in the zion client
    if (
        (!provider.current || provider.current.chainId != activeChain?.id) &&
        typeof window !== 'undefined' &&
        window?.ethereum
    ) {
        provider.current = {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            provider: new ethers.providers.Web3Provider(window.ethereum),
            chainId: activeChain?.id,
        }
    }

    console.log('use web3', {
        connector,
        address,
        activeChain,
        chains,
        rpc: activeChain?.rpcUrls,
        def: activeChain?.rpcUrls?.default,
        status,
    })

    const sign = useCallback(
        async (
            message: string,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            walletAddress: string,
        ): Promise<string | undefined> => {
            return signMessageAsync({ message })
        },
        [signMessageAsync],
    )

    return {
        provider: provider.current?.provider,
        sign: sign,
        accounts: address ? [address] : [],
        chain: activeChain,
        chains: chains,
        isConnected: isConnected,
        walletStatus: status as WalletStatus,
    }
}
