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
                spaceId: spaceId?.streamId,
                channelId: channelId?.streamId,
            })

            if (link) {
                navigate(link)
            }
        },
        [channelId?.streamId, navigate, spaceId?.streamId, createLink],
    )
    return {
        onOpenMessageThread,
    }
}
