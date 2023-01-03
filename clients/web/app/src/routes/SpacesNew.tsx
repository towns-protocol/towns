import React, { useCallback, useEffect } from 'react'
import { Membership, RoomIdentifier } from 'use-zion-client'
import { Box, Stack } from '@ui'
import { CreateSpaceFormV2 } from '@components/Web3/CreateSpaceFormV2'
import { useCreateSpaceFormStore } from '@components/Web3/CreateSpaceFormV2/CreateSpaceFormStore'

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
                    <CreateSpaceFormV2 onCreateSpace={onCreateSpace} />
                </Box>
            </Stack>
        </Stack>
    )
}
