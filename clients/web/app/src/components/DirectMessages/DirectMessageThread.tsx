import React, { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { SpaceContextProvider } from 'use-zion-client'
import { useSearchParams } from 'react-router-dom'
import { DMChannelContextUserLookupProvider } from 'use-zion-client/dist/components/UserLookupContext'
import { Stack } from '@ui'
import { SpacesChannel } from 'routes/SpacesChannel'
import { useCreateLink } from 'hooks/useCreateLink'

export const DirectMessageThread = () => {
    const { createLink } = useCreateLink()
    const navigate = useNavigate()
    const [search] = useSearchParams()
    const { channelSlug } = useParams()
    const onBack = useCallback(() => {
        if (search.get('ref')) {
            // if panel has been referred from another place in the app, go back
            // to that place rather than parent. (e.g. from profile panel)
            navigate(-1)
        } else {
            const link = createLink({ route: 'messages' })
            if (link) {
                navigate(link)
            }
        }
    }, [createLink, navigate, search])

    return (
        <Stack height="100%" width="100%">
            <SpaceContextProvider spaceId={undefined}>
                <DMChannelContextUserLookupProvider channelId={channelSlug ?? ''}>
                    <SpacesChannel onTouchClose={onBack} />
                </DMChannelContextUserLookupProvider>
            </SpaceContextProvider>
        </Stack>
    )
}
