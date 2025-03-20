import {
    ChannelMessageEvent,
    MessageType,
    ReactionEvent,
    RiverTimelineEvent,
    TimelineEvent,
} from '@towns-protocol/sdk'

export const getIsChannelMessageContent = (e?: TimelineEvent): ChannelMessageEvent | undefined => {
    if (e?.content?.kind === RiverTimelineEvent.ChannelMessage) {
        return e.content
    }
}

export const getIsReactionContent = (e?: TimelineEvent): ReactionEvent | undefined => {
    if (e?.content?.kind === RiverTimelineEvent.Reaction) {
        return e.content
    }
}

export const getMessageBody = (eventId: string, message: ChannelMessageEvent): string => {
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

// from lexical/markdown
const LINK = {
    importRegExp: /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
}

export function getUrls(body: string) {
    const regexp = new RegExp(LINK.importRegExp, 'g')
    return [...new Set(Array.from(body.matchAll(regexp), (m) => m[2]))]
}
