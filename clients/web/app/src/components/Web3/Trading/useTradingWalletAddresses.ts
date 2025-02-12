import { useSolanaWallets } from '@privy-io/react-auth'
import { useMemo } from 'react'
import { useConnectivity } from 'use-towns-client'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export const useTradingWalletAddresses = () => {
    const { wallets: solanaWallets } = useSolanaWallets()
    const solanaWalletAddress = useMemo(
        () => solanaWallets.find((w) => w.walletClientType === 'privy')?.address,
        [solanaWallets],
    )

    const { loggedInWalletAddress } = useConnectivity()
    const { data: evmWalletAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    return { evmWalletAddress, solanaWalletAddress }
}
