import React from 'react'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useStore } from 'store/store'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { DecentTransactionReceipt, Onboarding, getDecentScanLink } from '../Decent/Onboarding'
import { trackFundWalletTx } from './fundWalletAnalytics'

export const FundWalletModal = () => {
    const fundWalletModalOpen = useStore((state) => state.fundWalletModalOpen)
    const setFundWalletModalOpen = useStore((state) => state.setFundWalletModalOpen)
    if (!fundWalletModalOpen) {
        return null
    }
    return (
        <ModalContainer maxWidth="400" onHide={() => setFundWalletModalOpen(false)}>
            <Onboarding
                onTxSuccess={(r) => {
                    if (r) {
                        setFundWalletModalOpen(false)
                        trackFundWalletTx({ success: true })
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
                    trackFundWalletTx({ success: false })
                }}
            />
        </ModalContainer>
    )
}
