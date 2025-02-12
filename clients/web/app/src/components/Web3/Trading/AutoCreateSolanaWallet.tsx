import { useEffect } from 'react'
import { useSolanaWallets } from '@privy-io/react-auth'

export const AutoCreateSolanaWallet = () => {
    const { wallets, createWallet } = useSolanaWallets()
    useEffect(() => {
        if (wallets.length === 0) {
            createWallet()
                .then(() => {
                    console.log('Created Solana Wallet')
                })
                .catch((error) => {
                    console.error('Failed to create Solana Wallet', error)
                })
        }
    }, [wallets.length, createWallet])
    return null
}
