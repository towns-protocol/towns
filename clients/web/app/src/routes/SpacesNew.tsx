import React, { useEffect } from 'react'
import { Box, Stack } from '@ui'
import { CreateSpaceForm } from '@components/Web3/CreateSpaceForm'
import { useCreateSpaceFormStore } from '@components/Web3/CreateSpaceForm/CreateSpaceFormStore'

export const SpacesNew = () => {
    useEffect(() => {
        return () => {
            useCreateSpaceFormStore.getState().reset()
        }
    }, [])

    return (
        <Stack alignItems="center" height="100%">
            <Stack grow padding="lg">
                <Box minWidth="700">
                    <CreateSpaceForm />
                </Box>
            </Stack>
        </Stack>
    )
}
