import { usePrivy, useWallets } from '@privy-io/react-auth'

export function useEmbeddedWallet() {
    const { ready: privyReady } = usePrivy()
    const { wallets } = useWallets()
    const privyWallet = privyReady
        ? wallets.find((wallet) => wallet.walletClientType === 'privy')
        : undefined

    return privyWallet
}
