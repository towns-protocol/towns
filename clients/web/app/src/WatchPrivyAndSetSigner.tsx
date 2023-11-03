import { useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'
import { useWeb3Context, walletClientToSigner } from 'use-zion-client'
import { getWalletClient } from 'wagmi/actions'
import { waitFor } from 'utils'

// probably can be much lower but want to test this value for now
export const waitForWalletClientMs = 2_000

// TODO: not using this b/c testing passing web3Signer directly to ZionContextProvider
// in the case that the app loads and privy for some reason is late to set the Web3Context signer (or doesn't set it at all)
// this component wathches for the privy wallet to be connected and then sets the signer
export function WatchPrivyAndSetSigner({ chainId }: { chainId: number }) {
    const embeddedWallet = useEmbeddedWallet()
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

        if (embeddedWallet && !signer) {
            _setSigner()
        }
    }, [chainId, setSigner, signer, embeddedWallet])

    return null
}
// https://docs.privy.io/guide/guides/wagmi#4-set-the-users-active-wallet
// we only have an embedded wallet for now, so useWalletClient should be returning that one
// however once wallet linking is established, we may need to be setting user's active wallet appropriately
export function useEmbeddedWallet() {
    const { wallets } = useWallets()
    return wallets.find((wallet) => wallet.walletClientType === 'privy')
}
