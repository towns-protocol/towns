import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'
export function useEmbeddedWallet() {
    const { ready: privyReady, authenticated } = usePrivy()
    const { wallets, ready: walletsReady } = useWallets()

    const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy')

    useEffect(() => {
        console.log('[useEmbeddedWallet]', {
            privyReady,
            walletsReady,
            authenticated,
            wallets,
            embeddedWallet,
        })
    }, [privyReady, walletsReady, authenticated, wallets, embeddedWallet])

    return {
        embeddedWallet,
        privyReady,
        walletsReady,
        privyAuthenticated: authenticated,
    }
}
