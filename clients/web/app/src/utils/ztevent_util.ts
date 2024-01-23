import { LINK } from '@lexical/markdown'
import {
    MessageType,
    ReactionEvent,
    RoomMessageEvent,
    TimelineEvent,
    ZTEvent,
} from 'use-zion-client'

export const getIsRoomMessageContent = (e?: TimelineEvent): RoomMessageEvent | undefined => {
    if (e?.content?.kind === ZTEvent.RoomMessage) {
        return e.content
    }
}

export const getIsReactionContent = (e?: TimelineEvent): ReactionEvent | undefined => {
    if (e?.content?.kind === ZTEvent.Reaction) {
        return e.content
    }
}

export const getMessageBody = (eventId: string, message: RoomMessageEvent): string => {
    switch (message.content.msgType) {
        case MessageType.GM:
            return `${message.body} 
      ${eventId}
      `
        case MessageType.Text:
            return message.body
        default:
            return `${message.body}\n*Unsupported message type* **${message.content.msgType}**`
    }
}

// matching whatever lexical decides a "url" is
export function getUrls(body: string) {
    const regexp = new RegExp(LINK.importRegExp, 'g')
    return [...new Set(Array.from(body.matchAll(regexp), (m) => m[2]))]
}
