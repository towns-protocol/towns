import { useSolanaWallets } from '@privy-io/react-auth'
import { useMemo } from 'react'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export const useTradingWalletAddresses = () => {
    const { wallets: solanaWallets } = useSolanaWallets()
    const solanaWalletAddress = useMemo(
        () => solanaWallets.find((w) => w.walletClientType === 'privy')?.address,
        [solanaWallets],
    )

    const { data: evmWalletAddress } = useMyAbstractAccountAddress()

    return { evmWalletAddress, solanaWalletAddress }
}
