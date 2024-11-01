import React from 'react'
import { useConnectWallet } from '@privy-io/react-auth'
import { useLinkEOAToRootKeyTransaction } from 'use-towns-client'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { Analytics } from 'hooks/useAnalytics'
import { GetSigner } from 'privy/WalletReady'
import { mapToErrorMessage } from './utils'

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

    const { connectWallet } = useConnectWallet({
        onSuccess: async (wallet) => {
            // could be either a ethereum or solana wallet
            if ('chainId' in wallet && 'getEthersProvider' in wallet) {
                Analytics.getInstance().track('connected wallet', {
                    walletName: wallet.meta.name,
                })

                const rootSigner = await getSigner()
                if (!rootSigner) {
                    createPrivyNotAuthenticatedNotification()
                    return
                }

                const chainString = baseChain.id.toString()

                let errorSubMessage: string | undefined = undefined
                if (!wallet.chainId.includes(chainString)) {
                    try {
                        await wallet.switchChain(baseChain.id)
                    } catch (e) {
                        console.error(
                            '[useConnectThenLink] error switching chain for connected wallet',
                            e,
                        )
                        errorSubMessage = mapToErrorMessage({
                            error: e as Error,
                            source: 'connect then link switch chain',
                        })
                    }
                }

                const provider = await wallet.getEthersProvider()
                // switching the chain doesn't immediately update in `wallet` (ms later it does)
                // so we need to check the network
                const networkChainId = (await provider.getNetwork()).chainId

                if (networkChainId === baseChain.id) {
                    onLinkWallet(rootSigner, provider.getSigner())
                } else {
                    popupToast(({ toast }) => (
                        <StandardToast.Error
                            toast={toast}
                            message={`Please make sure your wallet supports and is connected to the ${baseChain.name} network.`}
                            subMessage={errorSubMessage}
                        />
                    ))
                }
            } else {
                console.log('[useConnectThenLink] unknown wallet type', wallet)
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message="We could not connect this wallet. Please make sure it is an EVM compatible wallet."
                    />
                ))
            }
        },
        onError: (error) => {
            console.error('[useConnectThenLink] error connecting wallet', error)

            popupToast(({ toast }) => (
                <StandardToast.Error
                    toast={toast}
                    message={`Please make sure your wallet supports and is connected to the ${baseChain.name} network.`}
                    subMessage={mapToErrorMessage({
                        error: new Error(error),
                        source: 'connect then link privy connect error',
                    })}
                />
            ))
        },
    })

    return connectWallet
}
