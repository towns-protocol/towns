import { IContent, MatrixClient } from 'matrix-js-sdk'
import truncate from 'lodash/truncate'
import {
    ImageMessageContent,
    MessageContent,
    MessageType,
    SendMessageOptions,
} from '../../types/zion-types'

import { MatrixRoomIdentifier } from '../../types/room-identifier'
import { NoticeEvent } from '../../types/timeline-types'

function getMessageContent(message: string, options: SendMessageOptions): MessageContent {
    const defaultContent: MessageContent = {
        body: `${message}`,
        msgtype: options.messageType ?? MessageType.Text,
    }

    switch (options.messageType) {
        case MessageType.Image: {
            const content: ImageMessageContent = {
                ...defaultContent,
                info: options.info,
                thumbnail: options.thumbnail,
            }
            return content
        }
        case undefined:
        case MessageType.Text: {
            if (options.mentions) {
                return {
                    ...defaultContent,
                    mentions: options.mentions,
                }
            } else {
                return defaultContent
            }
        }
        default:
            return defaultContent
    }
}

export function editMessageContent(
    message: string,
    previousContent: MessageContent,
    options: SendMessageOptions,
): MessageContent {
    const content = {
        ...previousContent,
        body: message,
        msgtype: options.messageType ?? MessageType.Text,
    }
    switch (options.messageType) {
        case MessageType.Image:
            return {
                ...content,
                info: options.info,
                thumbnail: options.thumbnail,
            }
        case undefined:
        case MessageType.Text:
            if (options.mentions) {
                return {
                    ...content,
                    mentions: options.mentions,
                }
            }
            return content
        default:
            return content
    }
}

/** treat message as a reply to parentId if specified */
export async function sendMatrixMessage(
    matrixClient: MatrixClient,
    roomId: MatrixRoomIdentifier,
    message: string,
    options?: SendMessageOptions,
): Promise<void> {
    const content = getMessageContent(message, options ?? {})

    if (!options?.threadId) {
        await matrixClient.sendEvent(roomId.networkId, 'm.room.message', content, '')
    } else {
        // send as reply
        await matrixClient.sendEvent(
            roomId.networkId,
            options.threadId,
            'm.room.message',
            {
                ...content,
                threadPreview: truncate(options.threadPreview, { length: 128 }),
                'm.relates_to': {
                    'm.in_reply_to': {
                        event_id: options.threadId,
                    },
                },
            },
            '',
        )
    }
}

export async function sendMatrixNotice(
    matrixClient: MatrixClient,
    roomId: MatrixRoomIdentifier,
    event: NoticeEvent,
): Promise<void> {
    const content: IContent = {
        msgtype: MessageType.Notice,
        ...event,
    }
    await matrixClient.sendEvent(roomId.networkId, MessageType.Notice, content)
}
