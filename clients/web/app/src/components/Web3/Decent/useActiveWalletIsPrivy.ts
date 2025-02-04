import { useWallets } from '@privy-io/react-auth'
import { useAccount, useConnect } from 'wagmi'

export function useActiveWalletIsPrivy() {
    const { wallets } = useWallets()
    const { address } = useAccount()
    const privyWallet = wallets.find((w) => w.walletClientType === 'privy')

    return privyWallet?.address?.toLowerCase() === address?.toLowerCase()
}

export function useIsWagmiConnected() {
    const { address } = useAccount()
    return address !== undefined
}

export function useWagmiConnectWallet() {
    const { connect } = useConnect()
    return connect
}
