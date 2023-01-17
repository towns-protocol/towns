import React, { useCallback, useEffect } from 'react'
import { Membership, RoomIdentifier } from 'use-zion-client'
import { Box, Stack } from '@ui'
import { CreateSpaceForm } from '@components/Web3/CreateSpaceForm'
import { useCreateSpaceFormStore } from '@components/Web3/CreateSpaceForm/CreateSpaceFormStore'

export const SpacesNew = () => {
    const setCreatedSpaceId = useCreateSpaceFormStore((s) => s.setCreatedSpaceId)

    const onCreateSpace = useCallback(
        (roomId: RoomIdentifier, membership: Membership) => {
            setCreatedSpaceId(roomId.slug)
        },
        [setCreatedSpaceId],
    )

    useEffect(() => {
        return () => {
            useCreateSpaceFormStore.getState().reset()
        }
    }, [])

    return (
        <Stack alignItems="center" height="100%">
            <Stack grow width="600">
                <Box padding="lg">
                    <CreateSpaceForm onCreateSpace={onCreateSpace} />
                </Box>
            </Stack>
        </Stack>
    )
}
