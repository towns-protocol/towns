import React from 'react'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useStore } from 'store/store'
import { Onboarding } from '../Decent/Onboarding'

export const FundWalletModal = () => {
    const fundWalletModalOpen = useStore((state) => state.fundWalletModalOpen)
    const setFundWalletModalOpen = useStore((state) => state.setFundWalletModalOpen)
    if (!fundWalletModalOpen) {
        return null
    }
    return (
        <ModalContainer maxWidth="400" onHide={() => setFundWalletModalOpen(false)}>
            <Onboarding />
        </ModalContainer>
    )
}
