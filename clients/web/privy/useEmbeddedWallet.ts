import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'

export function useEmbeddedWallet() {
    const { ready: privyReady, authenticated } = usePrivy()
    const { wallets, ready } = useWallets()
    const privyWallet = wallets.find((wallet) => wallet.walletClientType === 'privy')

    useEffect(() => {
        if (!privyReady) {
            console.log('Privy not ready. Authentication status: ', authenticated)
        }
        if (!ready) {
            console.log('Privy wallet not ready. Authentication status: ', authenticated)
        } else {
            console.log('Privy wallet ready. Authentication status: ', authenticated)
        }

        if (!privyWallet) {
            console.log('Privy wallet not found. Authentication status: ', authenticated)
        }
    }, [authenticated, privyReady, privyWallet, ready])

    return privyWallet
}
