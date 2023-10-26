import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { RoomIdentifier } from 'use-zion-client'
import { useCreateLink } from './useCreateLink'

export const useOpenMessageThread = (spaceId?: RoomIdentifier, channelId?: RoomIdentifier) => {
    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const onOpenMessageThread = useCallback(
        (eventId: string) => {
            const link = createLink({
                threadId: eventId,
                spaceId: spaceId?.slug,
                channelId: channelId?.slug,
            })
            if (link) {
                navigate(link)
            }
        },
        [channelId?.slug, navigate, spaceId?.slug, createLink],
    )
    return {
        onOpenMessageThread,
    }
}
