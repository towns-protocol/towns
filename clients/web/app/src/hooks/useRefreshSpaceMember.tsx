import React, { useCallback, useEffect } from 'react'
import { Toast } from 'react-hot-toast'
import { SpaceAddressFromSpaceId, TransactionStatus, useRefreshMetadataTx } from 'use-towns-client'
import { StandardToast } from '@components/Notifications/StandardToast'
import { ReauthenticateToast, WalletReady } from 'privy/WalletReady'
import { popupToast } from '@components/Notifications/popupToast'
import { openSeaAssetUrl } from '@components/Web3/utils'
import { useEnvironment } from './useEnvironmnet'

export const useRefreshSpaceMember = (spaceId: string | undefined) => {
    const { baseChain } = useEnvironment()
    const {
        refreshMetadataTransaction,
        transactionStatus,
        reset: resetTxContext,
    } = useRefreshMetadataTx()

    const toast: React.ElementType<{ toast: Toast }> = useCallback(
        ({ toast }: { toast: Toast }) => {
            return (
                <WalletReady
                    LoginButton={
                        <ReauthenticateToast
                            toast={toast}
                            message="Please reauthenticate to publish your space metadata to OpenSea"
                            cta="Reauthenticate"
                        />
                    }
                >
                    {({ getSigner }) => (
                        <StandardToast
                            message="Would you like to publish the space metadata to OpenSea?"
                            toast={toast}
                            ctaColor="positive"
                            icon="openSeaPlain"
                            iconProps={{ color: 'gray2' }}
                            cta="Publish"
                            onCtaClick={async ({ dismissToast }) => {
                                const signer = await getSigner()
                                if (!signer || !spaceId) {
                                    return
                                }
                                // emit event to update the nft metadata
                                await refreshMetadataTransaction(spaceId, signer)
                                dismissToast()
                            }}
                        />
                    )}
                </WalletReady>
            )
        },
        [refreshMetadataTransaction, spaceId],
    )

    useEffect(() => {
        if (!spaceId) {
            return
        }
        if (transactionStatus === TransactionStatus.Success) {
            popupToast(({ toast }) => (
                <StandardToast.Success
                    message="Your space metadata has been published to OpenSea"
                    cta="View on OpenSea"
                    toast={toast}
                    onCtaClick={({ dismissToast }) => {
                        window.open(
                            `${openSeaAssetUrl(baseChain.id, SpaceAddressFromSpaceId(spaceId))}`,
                            '_blank',
                            'noopener,noreferrer',
                        )
                        dismissToast()
                    }}
                />
            ))
        }
        if (transactionStatus === TransactionStatus.Failed) {
            popupToast(({ toast }) => (
                <WalletReady
                    LoginButton={
                        <ReauthenticateToast
                            toast={toast}
                            message="Please reauthenticate to publish your space metadata to OpenSea"
                            cta="Reauthenticate"
                        />
                    }
                >
                    {({ getSigner }) => (
                        <StandardToast.Error
                            message="Something went wrong while publishing your space metadata to OpenSea"
                            toast={toast}
                            cta={spaceId ? 'Try again' : undefined}
                            onCtaClick={async ({ dismissToast }) => {
                                if (!spaceId) {
                                    return
                                }
                                const signer = await getSigner()
                                if (!signer) {
                                    return
                                }
                                resetTxContext()
                                await refreshMetadataTransaction(spaceId, signer)
                                dismissToast()
                            }}
                        />
                    )}
                </WalletReady>
            ))
        }
        resetTxContext()
    }, [transactionStatus, refreshMetadataTransaction, resetTxContext, spaceId, baseChain.id])

    return {
        toast,
        status: transactionStatus,
    }
}
