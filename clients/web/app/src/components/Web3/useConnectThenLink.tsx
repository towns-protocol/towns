import React from 'react'
import { useConnectWallet } from '@privy-io/react-auth'
import { useGetEmbeddedSigner } from '@towns/privy'
import { useLinkEOAToRootKeyTransaction } from 'use-towns-client'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'

export function useConnectThenLink({
    onLinkWallet,
}: {
    onLinkWallet: (
        ...args: Parameters<
            ReturnType<typeof useLinkEOAToRootKeyTransaction>['linkEOAToRootKeyTransaction']
        >
    ) => void
}) {
    const { getSigner } = useGetEmbeddedSigner()
    const { baseChain } = useEnvironment()

    const { connectWallet } = useConnectWallet({
        onSuccess: async (wallet) => {
            const rootSigner = await getSigner()
            if (!rootSigner) {
                createPrivyNotAuthenticatedNotification()
                return
            }

            const chainString = baseChain.id.toString()

            if (!wallet.chainId.includes(chainString)) {
                try {
                    await wallet.switchChain(baseChain.id)
                } catch (e) {
                    console.error(
                        '[useConnectThenLink] error switching chain for connected wallet',
                        e,
                    )
                }
            }

            if (wallet.chainId.includes(chainString)) {
                onLinkWallet(rootSigner, (await wallet.getEthersProvider()).getSigner())
            } else {
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message={`Please make sure your wallet supports and is connected to the ${baseChain.name} network.`}
                    />
                ))
            }
        },
        onError: (error) => {
            console.error('[useConnectThenLink] error connecting wallet', error)
        },
    })

    return connectWallet
}
