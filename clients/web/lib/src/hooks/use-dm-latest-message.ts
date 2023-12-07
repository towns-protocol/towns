import { RoomIdentifier } from '../types/room-identifier'
import { useTimeline } from './use-timeline'
import { TimelineEvent, TimelineEvent_OneOf, ZTEvent } from '../types/timeline-types'

import { MessageType } from '../types/zion-types'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { useMemo } from 'react'

export type MostRecentMessageInfo_OneOf =
    | MostRecentMessageInfoMedia
    | MostRecentMessageInfoText
    | MostRecentMessageEncrypted

export interface MostRecentMessageInfoMedia {
    kind: 'media'
}

export interface MostRecentMessageInfoText {
    kind: 'text'
    text: string
}

export interface MostRecentMessageEncrypted {
    kind: 'encrypted'
}

type LatestMessageInfo = {
    createdAtEpocMs: number
    info: ReturnType<typeof toMostRecentMessageInfo> | undefined
    sender: TimelineEvent['sender']
}

export function useDMLatestMessage(roomId: RoomIdentifier) {
    const { timeline } = useTimeline(roomId)
    const unreadMarker = useFullyReadMarkerStore((state) => state.markers[roomId.networkId])

    // let's not count unreads if the timeline doesn't yet contain the event marked as unread
    const hasRelevantUnreadMarker =
        unreadMarker.isUnread && timeline.some((event) => event.eventId === unreadMarker?.eventId)

    const latestMessage = useMemo(() => {
        let markerReached = false
        let unreadCount = 0
        let latest: LatestMessageInfo | undefined
        for (let i = timeline.length - 1; i >= 0; i--) {
            const message = timeline[i]
            const info = toMostRecentMessageInfo(message.content)

            if (!markerReached && info && hasRelevantUnreadMarker) {
                unreadCount++
            }
            if (!latest && info) {
                latest = {
                    createdAtEpocMs: message.createdAtEpocMs,
                    info: info,
                    sender: message.sender,
                }
            }
            if (unreadMarker?.eventId === message.eventId) {
                // we don't need to look further than the lastest unread marker
                markerReached = true
            }
        }
        return { latest, unreadCount }
    }, [hasRelevantUnreadMarker, timeline, unreadMarker?.eventId])
    return latestMessage
}

function toMostRecentMessageInfo(
    content?: TimelineEvent_OneOf,
): MostRecentMessageInfo_OneOf | undefined {
    if (content?.kind === ZTEvent.RoomMessageEncrypted) {
        return {
            kind: 'encrypted',
        }
    }
    if (content?.kind !== ZTEvent.RoomMessage) {
        return undefined
    }

    switch (content.msgType) {
        case MessageType.Text:
            return {
                kind: 'text',
                text: content.body,
            }
        case MessageType.ChunkedMedia:
        case MessageType.EmbeddedMedia:
        case MessageType.Image:
            return {
                kind: 'media',
            }
        default:
            return undefined
    }
}
