import React from 'react'
import { useLinkEOAToRootKeyTransaction } from 'use-towns-client'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { GetSigner } from 'privy/WalletReady'
import { StandardToast } from '@components/Notifications/StandardToast'
import { popupToast } from '@components/Notifications/popupToast'
import { Analytics } from 'hooks/useAnalytics'
import { switchConnectedWalletChain } from './switchConnectedWalletChain'
import { usePrivyConnectWallet } from './usePrivyConnectWallet'
import { mapToErrorMessage } from '../utils'

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
        onSuccess: async ({ wallet }) => {
            const rootSigner = await getSigner()
            if (!rootSigner) {
                createPrivyNotAuthenticatedNotification()
                return
            }
            Analytics.getInstance().track('connected wallet', {
                walletName: wallet.meta.name,
            })
            switchConnectedWalletChain({
                wallet,
                baseChain,
                onSuccess: (signer) => {
                    onLinkWallet(rootSigner, signer)
                },
            })
        },
        onError: (error) => {
            console.error('[useConnectThenLink] error connecting wallet', error)
            popupToast(({ toast }) => (
                <StandardToast.Error
                    toast={toast}
                    message={`Please make sure your wallet supports and is connected to the ${baseChain.name} network.`}
                    subMessage={mapToErrorMessage({
                        error: new Error(error),
                        source: 'useConnectThenLink privy connect error',
                    })}
                />
            ))
        },
    })

    return connectWallet
}
