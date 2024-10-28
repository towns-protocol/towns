import { usePrivy, useWallets } from '@privy-io/react-auth'

export function useEmbeddedWallet() {
    const { ready: privyReady, authenticated } = usePrivy()
    const { wallets, ready: walletsReady } = useWallets()

    if (!privyReady || !walletsReady || !authenticated) {
        return undefined
    }

    return wallets.find((wallet) => wallet.walletClientType === 'privy')
}
