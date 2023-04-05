import { Client as CasablancaClient } from '@towns/sdk'
import {
    ReactionEvent,
    RoomMessageEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../types/timeline-types'
import {
    EditMessageOptions,
    MessageType,
    SendMessageOptions,
    SendZionReactionOptions,
} from '../../types/zion-types'
import { CasablancaStreamIdentifier } from '../../types/room-identifier'

/** treat message as a reply to parentId if specified */
export async function sendCsbMessage(
    casablancaClient: CasablancaClient,
    kind: ZTEvent,
    roomId: CasablancaStreamIdentifier,
    message: string,
    msgOptions?: SendMessageOptions,
    rcnOptions?: SendZionReactionOptions,
    editOptions?: EditMessageOptions,
): Promise<void> {
    const sendEvent = async function (e: TimelineEvent_OneOf): Promise<void> {
        return await casablancaClient.sendMessage(roomId.networkId, JSON.stringify(e))
    }

    if (msgOptions && !msgOptions?.messageType) {
        msgOptions.messageType = MessageType.Text
    }

    switch (kind) {
        case ZTEvent.RoomMessage: {
            const event = {
                kind: kind,
                body: message,
                msgType: msgOptions?.messageType,
                inReplyTo: msgOptions?.threadId,
                mentions: msgOptions?.messageType === MessageType.Text ? msgOptions.mentions : [],
                content: {}, // start deprecating matrix IContent
                replacedMsgId: editOptions?.originalEventId,
            } as RoomMessageEvent
            return await sendEvent(event)
        }
        case ZTEvent.Reaction: {
            const event = {
                kind: kind,
                reaction: message,
                targetEventId: rcnOptions?.targetEventId,
            } as ReactionEvent
            return await sendEvent(event)
        }
    }
}
