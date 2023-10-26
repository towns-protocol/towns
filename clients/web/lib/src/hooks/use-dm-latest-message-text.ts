import { RoomIdentifier } from '../types/room-identifier'
import { useTimeline } from './use-timeline'
import { ZTEvent } from '../types/timeline-types'
import { useMemo } from 'react'

export function useDMLatestMessageText(roomId: RoomIdentifier) {
    const { timeline } = useTimeline(roomId)
    const latestMessage = useMemo(() => {
        for (let i = timeline.length - 1; i >= 0; i--) {
            const message = timeline[i]
            if (message.content?.kind === ZTEvent.RoomMessage) {
                return message.content.body
            }
        }
        return undefined
    }, [timeline])
    return latestMessage
}
