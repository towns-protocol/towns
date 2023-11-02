import React from 'react'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Button, Stack, Text } from '@ui'

export const ConfirmLeaveModal = (props: {
    onConfirm: () => void
    onCancel: () => void
    text?: string
}) => {
    const { onConfirm, onCancel, text } = props

    return (
        <ModalContainer minWidth="auto" onHide={onCancel}>
            <Stack padding="sm" gap="lg" alignItems="center">
                <Text fontWeight="strong">{text}</Text>
                <Text>Are you sure you want to leave?</Text>
                <Stack horizontal gap>
                    <Button tone="level2" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button tone="negative" onClick={onConfirm}>
                        Confirm
                    </Button>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}
