import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { RoomIdentifier } from 'use-zion-client'

export const useOpenMessageThread = (spaceId?: RoomIdentifier, channelId?: RoomIdentifier) => {
    const navigate = useNavigate()
    const onOpenMessageThread = useCallback(
        (eventId: string) => {
            if (spaceId?.slug && channelId?.slug) {
                navigate(`/spaces/${spaceId.slug}/channels/${channelId.slug}/replies/${eventId}`)
            }
        },
        [channelId?.slug, navigate, spaceId?.slug],
    )
    return {
        onOpenMessageThread,
    }
}
