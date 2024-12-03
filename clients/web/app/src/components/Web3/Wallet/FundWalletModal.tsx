import React from 'react'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Onboarding } from '../Decent/Onboarding'

export const FundWalletModal = (props: {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
}) => {
    const { isOpen, setIsOpen } = props
    if (!isOpen) {
        return null
    }
    return (
        <ModalContainer maxWidth="400" onHide={() => setIsOpen(false)}>
            <Onboarding />
        </ModalContainer>
    )
}
