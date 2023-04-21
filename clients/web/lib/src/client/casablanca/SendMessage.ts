import { Client as CasablancaClient } from '@towns/sdk'
import {
    NoticeEvent,
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

export async function sendCsbNotice(
    _casablancaClient: CasablancaClient,
    _roomId: CasablancaStreamIdentifier,
    _event: NoticeEvent,
): Promise<void> {
    // todo
    // Modeled after https://spec.matrix.org/v1.6/client-server-api/#mnotice
    // Useful for things like blockchain transactions. The client should not
    // display the notice to the user, but may use the information contained
    // within the event.
}
