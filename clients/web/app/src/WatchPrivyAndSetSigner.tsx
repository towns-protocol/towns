import { useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'
import { useWeb3Context, walletClientToSigner } from 'use-zion-client'
import { getWalletClient } from 'wagmi/actions'
import { waitFor } from 'utils'

// probably can be much lower but want to test this value for now
export const waitForWalletClientMs = 2_000

// in the case that the app loads and privy for some reason is late to set the Web3Context signer (or doesn't set it at all)
// this component wathches for the privy wallet to be connected and then sets the signer
export function WatchPrivyAndSetSigner({ chainId }: { chainId: number }) {
    const { wallets } = useWallets()
    const { signer, setSigner } = useWeb3Context()

    useEffect(() => {
        const _setSigner = async () => {
            const walletClient = await waitFor(
                () => getWalletClient({ chainId }),
                waitForWalletClientMs,
            )
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
