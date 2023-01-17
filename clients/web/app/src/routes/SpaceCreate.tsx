import React, { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Membership, RoomIdentifier } from 'use-zion-client'
import { CreateSpaceForm } from '@components/Web3/CreateSpaceForm'
import { useCreateSpaceFormStore } from '@components/Web3/CreateSpaceForm/CreateSpaceFormStore'
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
                    <CreateSpaceForm onCreateSpace={onCreateSpace} />
                </Box>
            </Stack>
        </Stack>
    )
}
