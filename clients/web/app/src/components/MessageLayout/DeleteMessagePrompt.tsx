import React from 'react'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Button, Heading, Paragraph, Stack } from '@ui'

type Props = {
    onDeleteCancel: () => void
    onDeleteConfirm: () => void
}

export const DeleteMessagePrompt = (props: Props) => {
    const { onDeleteCancel, onDeleteConfirm } = props

    return (
        <ModalContainer onHide={onDeleteCancel}>
            <Stack padding="sm" gap="lg">
                <Heading level={3}>Delete message</Heading>
                <Paragraph>
                    Are you sure you want to delete this message? This cannot be undone.
                </Paragraph>

                <Stack horizontal gap justifyContent="end">
                    <Button onClick={onDeleteCancel}>Cancel</Button>
                    <Button tone="error" onClick={onDeleteConfirm}>
                        Delete
                    </Button>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}
