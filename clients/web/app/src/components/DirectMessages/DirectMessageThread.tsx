import React from 'react'
import { useParams } from 'react-router'
import { SpaceContextProvider } from 'use-zion-client'
import { DMChannelContextUserLookupProvider } from 'use-zion-client/dist/components/UserLookupContext'
import { Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { SpacesChannel } from 'routes/SpacesChannel'
import { SpacesChannelAnimated } from 'routes/SpacesChannelAnimated'

export const DirectMessageThread = () => {
    const { isTouch } = useDevice()

    const { channelSlug } = useParams()

    return (
        <Stack height="100%" width="100%">
            <SpaceContextProvider spaceId={undefined}>
                <DMChannelContextUserLookupProvider
                    fallbackToParentContext
                    channelId={channelSlug ?? ''}
                >
                    {isTouch ? <SpacesChannelAnimated /> : <SpacesChannel />}
                </DMChannelContextUserLookupProvider>
            </SpaceContextProvider>
        </Stack>
    )
}
