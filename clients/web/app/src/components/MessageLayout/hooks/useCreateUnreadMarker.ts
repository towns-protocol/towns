import { useCallback } from 'react'
import { TimelineEvent, useFullyReadMarker, useMyUserId } from 'use-towns-client'

export const useCreateUnreadMarker = (params: {
    eventId: string
    channelId?: string
    threadParentId: string | undefined
    timeline?: TimelineEvent[]
}) => {
    const { eventId, channelId, threadParentId, timeline } = params
    const myUserId = useMyUserId()
    const marker = useFullyReadMarker(channelId, threadParentId)

    const createUnreadMarker = useCallback(() => {
        const eventIndex = timeline?.findIndex((e) => e.eventId === eventId)
        if (eventIndex && eventIndex >= 0 && marker && timeline) {
            const mentions = timeline
                .slice(eventIndex)
                .filter(
                    (e) =>
                        e.isMentioned &&
                        e.threadParentId === threadParentId &&
                        e.sender.id !== myUserId,
                ).length
            return {
                ...marker,
                threadParentId,
                eventId,
                eventNum: BigInt(timeline[eventIndex].eventNum),
                mentions,
            }
        }
        return undefined
    }, [eventId, marker, myUserId, threadParentId, timeline])

    return {
        createUnreadMarker,
    }
}
