import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { RoomIdentifier } from 'use-zion-client'
import { PATHS } from 'routes'

export const useOpenMessageThread = (spaceId?: RoomIdentifier, channelId?: RoomIdentifier) => {
    const navigate = useNavigate()
    const onOpenMessageThread = useCallback(
        (eventId: string) => {
            if (spaceId?.slug && channelId?.slug) {
                navigate(
                    `/${PATHS.SPACES}/${spaceId.slug}/channels/${channelId.slug}/replies/${eventId}`,
                )
            }
        },
        [channelId?.slug, navigate, spaceId?.slug],
    )
    return {
        onOpenMessageThread,
    }
}
