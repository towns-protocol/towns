import { useLinkEOAToRootKeyTransaction } from 'use-towns-client'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { GetSigner } from 'privy/WalletReady'
import { switchConnectedWalletChain } from './switchConnectedWalletChain'
import { usePrivyConnectWallet } from './usePrivyConnectWallet'

export function useConnectThenLink({
    onLinkWallet,
    getSigner,
}: {
    onLinkWallet: (
        ...args: Parameters<
            ReturnType<typeof useLinkEOAToRootKeyTransaction>['linkEOAToRootKeyTransaction']
        >
    ) => void
    getSigner: GetSigner
}) {
    const { baseChain } = useEnvironment()

    const connectWallet = usePrivyConnectWallet({
        onSuccess: async (wallet) => {
            const rootSigner = await getSigner()
            if (!rootSigner) {
                createPrivyNotAuthenticatedNotification()
                return
            }
            switchConnectedWalletChain({
                wallet,
                baseChain,
                onSuccess: (signer) => {
                    onLinkWallet(rootSigner, signer)
                },
            })
        },
    })

    return connectWallet
}
