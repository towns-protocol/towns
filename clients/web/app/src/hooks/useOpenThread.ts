import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useCreateLink } from './useCreateLink'

export const useOpenMessageThread = (spaceId?: string, channelId?: string) => {
    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const onOpenMessageThread = useCallback(
        (eventId: string, params?: Record<string, string>) => {
            let link = createLink({
                threadId: eventId,
                channelId: channelId,
            })

            if (params) {
                link = `${link}?${new URLSearchParams(params).toString()}`
            }

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
