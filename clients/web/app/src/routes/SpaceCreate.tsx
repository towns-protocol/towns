import React, { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Membership, RoomIdentifier } from 'use-zion-client'
import { CreateSpaceFormV2 } from '@components/Web3/CreateSpaceFormV2'
import { useCreateSpaceFormStore } from '@components/Web3/CreateSpaceFormV2/CreateSpaceFormStore'
import { Box, Stack } from '@ui'

export const SpaceCreate = () => {
    const navigate = useNavigate()

    const onCreateSpace = useCallback(
        (roomId: RoomIdentifier, membership: Membership) => {
            navigate('/spaces/' + roomId.slug + '/')
        },
        [navigate],
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
