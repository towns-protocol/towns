import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { SpaceContextProvider } from 'use-zion-client'
import { Stack } from '@ui'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { SpacesChannel } from 'routes/SpacesChannel'

export const DirectMessageThread = () => {
    const { isTouch } = useDevice()
    const navigate = useNavigate()
    const onBack = useCallback(() => {
        navigate(`/${PATHS.MESSAGES}`)
    }, [navigate])

    return (
        <Stack height="100%" width="100%">
            {isTouch && <TouchPanelNavigationBar title="Message Thread" onBack={onBack} />}
            <SpaceContextProvider spaceId={undefined}>
                <SpacesChannel />
            </SpaceContextProvider>
        </Stack>
    )
}
