import { useEffect } from 'react'
import { useSolanaWallets } from '@privy-io/react-auth'

export const AutoCreateSolanaWallet = () => {
    const { wallets, createWallet, ready } = useSolanaWallets()
    useEffect(() => {
        if (wallets.length === 0 && ready) {
            createWallet()
                .then(() => {
                    console.log('Created Solana Wallet')
                })
                .catch((error) => {
                    console.warn('Failed to create Solana Wallet', error)
                })
        }
    }, [wallets.length, createWallet, ready])
    return null
}
