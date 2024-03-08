import { RefObject, useLayoutEffect, useMemo } from 'react'
import { TimelineEvent, useMyProfile } from 'use-towns-client'
import { getIsRoomMessageContent } from 'utils/ztevent_util'

export const useScrollDownOnNewMessage = (
    containerRef: RefObject<HTMLDivElement>,
    contentRef: RefObject<HTMLDivElement>,
    messages: TimelineEvent[],
) => {
    const userId = useMyProfile()?.userId

    const lastMessageIdByUser = useMemo(() => {
        for (let i = messages.length; i >= 0; i--) {
            const m = getIsRoomMessageContent(messages[i])
            if (m) {
                return messages[i].sender.id === userId ? messages[i].eventId : undefined
            }
        }
    }, [messages, userId])

    useLayoutEffect(() => {
        const container = containerRef?.current

        if (container) {
            container.scrollTop = container.scrollHeight
            container.scrollTo({ top: container.scrollHeight })
        }
    }, [lastMessageIdByUser, containerRef, contentRef])
}
