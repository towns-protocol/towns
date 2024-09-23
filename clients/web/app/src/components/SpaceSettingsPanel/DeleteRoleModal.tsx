import React from 'react'
import { useDeleteRoleTransaction } from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { useEvent } from 'react-use-event-hook'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Button, Paragraph, Stack } from '@ui'

export function DeleteRoleModal({
    hideDeleteModal,
    spaceId,
    roleId,
}: {
    spaceId: string | undefined
    roleId: number | undefined
    hideDeleteModal: () => void
}) {
    // success and error statuses are handled by <BlockchainTxNotifier />
    const { deleteRoleTransaction } = useDeleteRoleTransaction()
    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()
    const onDelete = useEvent(async () => {
        if (!spaceId || !roleId) {
            return
        }
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        hideDeleteModal()
        await deleteRoleTransaction(spaceId, roleId, signer)
    })

    return (
        <ModalContainer minWidth="400" onHide={hideDeleteModal}>
            <Stack gap="x4" padding="sm">
                <Paragraph strong>Are you sure you want to delete this role?</Paragraph>
                <Paragraph>This action cannot be undone.</Paragraph>
                <Stack horizontal gap alignSelf="end">
                    <Button onClick={hideDeleteModal}>Cancel</Button>
                    <Button
                        tone="error"
                        data-testid="confirm-delete-role-button"
                        disabled={!isPrivyReady}
                        onClick={onDelete}
                    >
                        Delete
                    </Button>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}
