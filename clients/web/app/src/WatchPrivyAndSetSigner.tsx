import { useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'
import { useWeb3Context, walletClientToSigner } from 'use-zion-client'
import { getWalletClient } from 'wagmi/actions'
import { waitFor } from 'utils'

export function WatchPrivyAndSetSigner({ chainId }: { chainId: number }) {
    const { wallets } = useWallets()
    const { signer, setSigner } = useWeb3Context()

    useEffect(() => {
        const _setSigner = async () => {
            const walletClient = await waitFor(() => getWalletClient({ chainId }), 2_000)
            if (!walletClient) {
                console.log('Failed to get WalletClient after Privy wallet connected')
                return
            }
            setSigner(walletClientToSigner(walletClient))
        }

        if (wallets?.[0]?.address && !signer) {
            _setSigner()
        }
    }, [chainId, setSigner, signer, wallets])

    return null
}
