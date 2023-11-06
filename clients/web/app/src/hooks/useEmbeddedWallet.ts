import { useWallets } from '@privy-io/react-auth'

// https://docs.privy.io/guide/guides/wagmi#4-set-the-users-active-wallet
// we only have an embedded wallet for now, so useWalletClient should be returning that one
// however once wallet linking is established, we may need to be setting user's active wallet appropriately
export function useEmbeddedWallet() {
    const { wallets } = useWallets()
    return wallets.find((wallet) => wallet.walletClientType === 'privy')
}
