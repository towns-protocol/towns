import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { SpaceContextProvider } from 'use-zion-client'
import { Stack } from '@ui'
import { PATHS } from 'routes'
import { SpacesChannel } from 'routes/SpacesChannel'

export const DirectMessageThread = () => {
    const navigate = useNavigate()
    const onBack = useCallback(() => {
        navigate(`/${PATHS.MESSAGES}`)
    }, [navigate])

    return (
        <Stack height="100%" width="100%">
            <SpaceContextProvider spaceId={undefined}>
                <SpacesChannel onTouchClose={onBack} />
            </SpaceContextProvider>
        </Stack>
    )
}
