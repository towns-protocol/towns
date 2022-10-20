import { useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import { useAccount, useNetwork, useSignMessage } from 'wagmi'
import { IWeb3Context } from '../../components/Web3ContextProvider'
import { WalletStatus } from 'types/web3-types'

/// web3 grabs some of the wagmi data for convience, please feel free to use wagmi directly
export function useWeb3(): IWeb3Context {
    const { address, connector, isConnected, status } = useAccount()
    const { chain: activeChain, chains } = useNetwork()
    const { signMessageAsync } = useSignMessage()

    const provider = useRef<ethers.providers.Web3Provider>()

    /// aellis 10.19.2022 note, we use wagmi for nearly everything,
    /// but we use the window.ethereum object for instanciating the contracts
    /// in the zion client
    if (!provider.current && typeof window !== 'undefined' && window?.ethereum) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        provider.current = new ethers.providers.Web3Provider(window.ethereum)
    }

    console.log('use web3', {
        connector,
        address,
        activeChain,
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
        provider: provider.current,
        sign: sign,
        accounts: address ? [address] : [],
        chain: activeChain,
        chains: chains,
        isConnected: isConnected,
        walletStatus: status as WalletStatus,
    }
}
