import { useSolanaWallets } from '@privy-io/react-auth'
import { useMemo } from 'react'

export const useSolanaWallet = () => {
    const { wallets: solanaWallets } = useSolanaWallets()
    const solanaWallet = useMemo(() => {
        return solanaWallets.find((wallet) => wallet.walletClientType === 'privy')
    }, [solanaWallets])
    return { solanaWallet }
}
