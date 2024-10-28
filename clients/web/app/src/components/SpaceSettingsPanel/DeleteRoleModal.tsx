import React from 'react'
import { useDeleteRoleTransaction } from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Button, Paragraph, Stack } from '@ui'
import { GetSigner, WalletReady } from 'privy/WalletReady'

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
    const onDelete = useEvent(async (getSigner: GetSigner) => {
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
                    <WalletReady>
                        {({ getSigner }) => (
                            <Button
                                tone="negative"
                                data-testid="confirm-delete-role-button"
                                onClick={() => onDelete(getSigner)}
                            >
                                Delete
                            </Button>
                        )}
                    </WalletReady>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}
