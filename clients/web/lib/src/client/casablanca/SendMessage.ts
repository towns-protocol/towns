import { Client as CasablancaClient } from '@zion/client'
import {
    ReactionEvent,
    RoomMessageEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../types/timeline-types'
import { MessageType, SendMessageOptions, SendZionReactionOptions } from '../../types/matrix-types'
import { CasablancaStreamIdentifier } from '../../types/room-identifier'

/** treat message as a reply to parentId if specified */
export async function sendCsbMessage(
    casablancaClient: CasablancaClient,
    kind: ZTEvent,
    roomId: CasablancaStreamIdentifier,
    message: string,
    msgOptions?: SendMessageOptions,
    rcnOptions?: SendZionReactionOptions,
): Promise<void> {
    const sendEvent = async function (e: TimelineEvent_OneOf): Promise<void> {
        return await casablancaClient.sendMessage(roomId.networkId, JSON.stringify(e))
    }

    switch (kind) {
        case ZTEvent.RoomMessage: {
            const event = {
                kind: kind,
                body: message,
                msgType: msgOptions?.messageType ?? MessageType.Text,
                mentions: [],
                content: {}, // start deprecating matrix IContent
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
