import React, { useMemo } from 'react'
import { useUserLookupContext } from 'use-towns-client'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Button, Stack, Text } from '@ui'

export const ConfirmBlockModal = (props: {
    onConfirm: () => void
    onCancel: () => void
    userId: string
}) => {
    const { onConfirm, onCancel, userId } = props
    const { usersMap } = useUserLookupContext()

    const globalUser = usersMap[userId]

    const title = useMemo(() => {
        const name = getPrettyDisplayName(globalUser)
        return `Block @${name}`
    }, [globalUser])

    const message = `Are you sure you want to block ${getPrettyDisplayName(
        globalUser,
    )}? This means they will not be able to DM you and you will not receive notifications for their messages in your existing groups.`

    return (
        <ModalContainer minWidth="300" onHide={onCancel}>
            <Stack padding="sm" gap="lg" alignItems="start" maxWidth="300">
                <Text fontWeight="strong">{title}</Text>
                <Text>{message}</Text>
                <Stack horizontal gap width="100%">
                    <Box grow />
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
