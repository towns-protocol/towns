import React from 'react'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useStore } from 'store/store'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { Box, IconButton, Text } from '@ui'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { DecentTransactionReceipt, Onboarding, getDecentScanLink } from '../Decent/Onboarding'
import {
    trackConnectWallet,
    trackFundWalletTx,
    trackFundWalletTxStart,
} from './fundWalletAnalytics'
import { ErrorContent } from '../UserOpTxModal/UserOpTxModal'

export const FundWalletModal = () => {
    const fundWalletModalOpen = useStore((state) => state.fundWalletModalOpen)
    const setFundWalletModalOpen = useStore((state) => state.setFundWalletModalOpen)
    if (!fundWalletModalOpen) {
        return null
    }
    return (
        <ModalContainer maxWidth="400" onHide={() => setFundWalletModalOpen(false)}>
            <ErrorBoundary
                FallbackComponent={({ error }) => (
                    <ErrorContent
                        containerName="FundWalletModal"
                        error={error}
                        message="There was an error adding funds to your Towns Wallet"
                        onHide={() => setFundWalletModalOpen(false)}
                    />
                )}
            >
                <FundWalletModalContent setFundWalletModalOpen={setFundWalletModalOpen} />
            </ErrorBoundary>
        </ModalContainer>
    )
}

const FundWalletModalContent = (props: { setFundWalletModalOpen: (open: boolean) => void }) => {
    const { setFundWalletModalOpen } = props
    return (
        <Box position="relative">
            <Box paddingBottom="md">
                <IconButton
                    icon="close"
                    alignSelf="end"
                    onClick={() => setFundWalletModalOpen(false)}
                />
                <Text strong size="lg" textAlign="center">
                    Add funds
                </Text>
            </Box>
            <Onboarding
                onConnectWallet={(wallet) =>
                    trackConnectWallet({
                        walletName: wallet.meta.name ?? 'unknown',
                        entrypoint: 'profile',
                    })
                }
                onTxStart={(args) => trackFundWalletTxStart(args, 'profile')}
                onTxSuccess={async (r) => {
                    if (r) {
                        setFundWalletModalOpen(false)
                        trackFundWalletTx({ success: true, entrypoint: 'profile' })
                        const receipt = r as DecentTransactionReceipt
                        const link = getDecentScanLink(receipt)

                        popupToast(({ toast }) => (
                            <StandardToast.Success
                                toast={toast}
                                message="You've added funds to your Towns Wallet!"
                                cta="View on DecentScan"
                                onCtaClick={() => {
                                    window.open(link, '_blank')
                                }}
                            />
                        ))
                    }
                }}
                onTxError={(e) => {
                    console.error('[Fund Wallet Tx] error', e)
                    trackFundWalletTx({ success: false, entrypoint: 'profile' })
                    popupToast(({ toast }) => (
                        <StandardToast.Error
                            toast={toast}
                            message="There was an error adding funds to your Towns Wallet"
                        />
                    ))
                }}
            />
        </Box>
    )
}
