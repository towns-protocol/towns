import React from 'react'
import { useParams } from 'react-router'
import { DMChannelContextUserLookupProvider, SpaceContextProvider } from 'use-towns-client'
import { Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { SpacesChannel } from 'routes/SpacesChannel'
import { SpacesChannelAnimated } from 'routes/SpacesChannelAnimated'

export const DirectMessageThread = () => {
    const { isTouch } = useDevice()

    const { channelSlug } = useParams()

    return channelSlug ? (
        <Stack height="100%" width="100%">
            <SpaceContextProvider spaceId={undefined}>
                <DMChannelContextUserLookupProvider
                    fallbackToParentContext
                    channelId={channelSlug ?? ''}
                >
                    {isTouch ? (
                        <SpacesChannelAnimated channelId={channelSlug} />
                    ) : (
                        <SpacesChannel />
                    )}
                </DMChannelContextUserLookupProvider>
            </SpaceContextProvider>
        </Stack>
    ) : (
        <>unspecified channel id</>
    )
}
