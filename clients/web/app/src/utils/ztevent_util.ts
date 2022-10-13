import { MessageType, RoomMessageEvent, TimelineEvent, ZTEvent } from 'use-zion-client'
import { ReactionEvent } from 'use-zion-client/dist/types/timeline-types'

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
    switch (message.msgType) {
        case MessageType.WenMoon:
            return `${message.content.body} 
      ${eventId}
      `
        case MessageType.Text:
            return (
                message.content.body ??
                // here for historical reasons TODO: delete
                message.content['m.body']
            )
        default:
            return `${message.content.body}\n*Unsupported message type* **${message.content.msgType}**`
    }
}

export const getParentEvent = (
    e: TimelineEvent,
    messages: TimelineEvent[],
    recursive?: boolean,
): TimelineEvent | undefined => {
    const messageContent = getIsRoomMessageContent(e)

    if (messageContent) {
        const relatesTo = messageContent.content['m.relates_to']

        if (!relatesTo) {
            return e
        }

        const relatedEventId = relatesTo.event_id
        const parentEvent = messages.find((m) => m.eventId === relatedEventId)

        if (!parentEvent) {
            console.warn(`relatedEvent with id "${relatedEventId}" can't be located at this time`)
            return undefined
        }

        if (recursive) {
            return getParentEvent(parentEvent, messages)
        } else {
            return parentEvent
        }
    }
}
