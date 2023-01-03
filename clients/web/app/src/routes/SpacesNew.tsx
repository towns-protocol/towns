import React, { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Membership, RoomIdentifier } from 'use-zion-client'
import { Box, Heading, Stack } from '@ui'
import { CreateSpaceForm } from '@components/Web3'
import { CreateSpaceFormV2 } from '@components/Web3/CreateSpaceFormV2'
import { isDev } from 'utils'
import { useCreateSpaceFormStore } from '@components/Web3/CreateSpaceFormV2/CreateSpaceFormStore'

const USE_V2 = isDev

export const SpacesNew = () => {
    const navigate = useNavigate()
    const setCreatedSpaceId = useCreateSpaceFormStore((s) => s.setCreatedSpaceId)

    const onCreateSpace = useCallback(
        (roomId: RoomIdentifier, membership: Membership) => {
            if (USE_V2) {
                setCreatedSpaceId(roomId.slug)
            } else {
                navigate('/spaces/' + roomId.slug + '/')
            }
        },
        [setCreatedSpaceId, navigate],
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
                    {USE_V2 ? (
                        <CreateSpaceFormV2 onCreateSpace={onCreateSpace} />
                    ) : (
                        <>
                            <Heading level={2} textAlign="center">
                                New Space
                            </Heading>
                            <CreateSpaceForm onClick={onCreateSpace} />
                        </>
                    )}
                </Box>
            </Stack>
        </Stack>
    )
}
