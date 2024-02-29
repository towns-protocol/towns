import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'

export function useEmbeddedWallet() {
    const { ready: privyReady, authenticated } = usePrivy()
    const { wallets, ready: walletsReady } = useWallets()
    // evan: I've noticed that sometimes in sessions, both my own and logs of others,
    // useWallets.ready is always false even though the embedded wallet is there and I'm able to make txs with it.
    // for that reason there is not `walletsReady` check here, only `privyReady` check
    const privyWallet = privyReady
        ? wallets.find((wallet) => wallet.walletClientType === 'privy')
        : undefined

    useEffect(() => {
        if (!privyReady) {
            console.log('Privy not ready. Authentication status: ', authenticated)
        }
        if (!walletsReady) {
            console.log('Privy wallet not ready. Authentication status: ', authenticated)
        } else {
            console.log('Privy wallet ready. Authentication status: ', authenticated)
        }

        if (!privyWallet) {
            console.log('Privy wallet not found. Authentication status: ', authenticated)
        }
    }, [authenticated, privyReady, privyWallet, walletsReady])

    return privyWallet
}
