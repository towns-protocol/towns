import { useAccount, useNetwork } from 'wagmi'
import { useCallback } from 'react'

export const useAddSepoliaToWallet = () => {
    const { chains } = useNetwork()
    const { isConnected } = useAccount()

    const shouldDisplaySepoliaPrompt =
        !chains.some((chain) => chain.id === 11155111) &&
        window.ethereum !== undefined &&
        isConnected
    const addSepoliaToWallet = useCallback(async () => {
        try {
            await window.ethereum?.request({
                method: 'wallet_addEthereumChain',
                params: [
                    {
                        chainId: '0xaa36a7', // 11155111 in hex
                        rpcUrls: ['https://rpc.sepolia.org'],
                        chainName: 'Sepolia',
                        nativeCurrency: { name: 'ETH', decimals: 18, symbol: 'ETH' },
                        blockExplorerUrls: ['https://sepolia.etherscan.io'],
                    },
                ],
            })
        } catch (error) {
            console.log('Failed to add sepolia to wallet', error)
        }
    }, [])

    return { shouldDisplaySepoliaPrompt, addSepoliaToWallet }
}
