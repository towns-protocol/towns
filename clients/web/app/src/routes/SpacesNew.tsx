import React, { useEffect } from 'react'
import { Box, Stack } from '@ui'
import { CreateSpaceForm } from '@components/Web3/CreateSpaceForm'
import { useCreateSpaceFormStore } from '@components/Web3/CreateSpaceForm/CreateSpaceFormStore'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/CreateSpaceForm/constants'

export const SpacesNew = () => {
    useEffect(() => {
        return () => {
            const { removeLoadedResource } = useImageStore.getState()
            removeLoadedResource(TEMPORARY_SPACE_ICON_URL)
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
