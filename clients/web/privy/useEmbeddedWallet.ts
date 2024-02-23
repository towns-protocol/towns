import { useWallets } from '@privy-io/react-auth'

export function useEmbeddedWallet() {
    const { wallets, ready } = useWallets()
    if (!ready) {
        console.log('Privy wallet not ready')
        return
    }
    const privyWallet = wallets.find((wallet) => wallet.walletClientType === 'privy')
    if (!privyWallet) {
        console.log('Privy wallet not found')
        return
    }
    return privyWallet
}
