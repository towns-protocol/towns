import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { SpaceContextProvider } from 'use-zion-client'
import { Stack } from '@ui'
import { PATHS } from 'routes'
import { SpacesChannel } from 'routes/SpacesChannel'
import { useCreateLink } from 'hooks/useCreateLink'

export const DirectMessageThread = () => {
    const { createLink } = useCreateLink()
    const navigate = useNavigate()

    const onBack = useCallback(() => {
        const link = createLink({ route: 'messages' })
        if (link) {
            navigate(link)
        }
    }, [createLink, navigate])

    return (
        <Stack height="100%" width="100%">
            <SpaceContextProvider spaceId={undefined}>
                <SpacesChannel onTouchClose={onBack} />
            </SpaceContextProvider>
        </Stack>
    )
}
