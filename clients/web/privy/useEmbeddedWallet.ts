import { usePrivy, useWallets } from '@privy-io/react-auth'

export function useEmbeddedWallet() {
    const { ready: privyReady, authenticated } = usePrivy()
    const { wallets, ready } = useWallets()
    if (!privyReady) {
        console.log('Privy not ready. Authentication status: ', authenticated)
    }
    if (!ready) {
        console.log('Privy wallet not ready. Authentication status: ', authenticated)
    }
    const privyWallet = wallets.find((wallet) => wallet.walletClientType === 'privy')
    if (!privyWallet) {
        console.log('Privy wallet not found. Authentication status: ', authenticated)
    }
    return privyWallet
}
