import { RoomIdentifier } from '../types/room-identifier'
import { useTimeline } from './use-timeline'
import { TimelineEvent_OneOf, ZTEvent } from '../types/timeline-types'
import { useMemo } from 'react'
import { MessageType } from '../types/zion-types'

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

export function useDMLatestMessage(roomId: RoomIdentifier) {
    const { timeline } = useTimeline(roomId)
    const latestMessage = useMemo(() => {
        for (let i = timeline.length - 1; i >= 0; i--) {
            const message = timeline[i]
            const info = toMostRecentMessageInfo(message.content)
            if (info) {
                return {
                    createdAtEpocMs: message.createdAtEpocMs,
                    info: info,
                }
            }
        }
        return undefined
    }, [timeline])
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
