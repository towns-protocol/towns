import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useCreateLink } from './useCreateLink'

export const useOpenMessageThread = (spaceId?: string, channelId?: string) => {
    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const onOpenMessageThread = useCallback(
        (eventId: string) => {
            const link = createLink({
                threadId: eventId,
                channelId: channelId,
            })

            if (link) {
                navigate(link)
            }
        },
        [channelId, navigate, createLink],
    )
    return {
        onOpenMessageThread,
    }
}
