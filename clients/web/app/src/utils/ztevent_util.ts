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
    switch (message.msgType) {
        case MessageType.WenMoon:
            return `${message.content.body} 
      ${eventId}
      `
        case MessageType.ZionText:
        case MessageType.Text:
            return (
                message.content.body ??
                // here for historical reasons TODO: delete
                message.content['m.body']
            )
        default:
            return `${message.content.body}\n*Unsupported message type* **${message.msgType}**`
    }
}
