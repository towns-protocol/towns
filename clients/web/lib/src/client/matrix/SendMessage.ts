import { MatrixClient } from 'matrix-js-sdk'
import {
    MessageContent,
    MessageType,
    RoomIdentifier,
    SendMessageOptions,
    ImageMessageContent,
    ZionTextMessageContent,
} from '../../types/matrix-types'

function getMessageContent(message: string, options: SendMessageOptions): MessageContent {
    const defaultContent: MessageContent = {
        body: `${message}`,
        msgtype: options.messageType ?? MessageType.Text,
    }

    switch (options.messageType) {
        case MessageType.Image: {
            const content: ImageMessageContent = {
                ...defaultContent,
                url: options.url,
                info: options.info,
            }
            return content
        }
        case MessageType.ZionText: {
            const content: ZionTextMessageContent = {
                ...defaultContent,
                ...(options.attachments ? { attachments: options.attachments } : {}),
            }
            return content
        }
        default:
            return defaultContent
    }
}

/** treat message as a reply to parentId if specified */
export async function sendZionMessage(props: {
    matrixClient: MatrixClient
    roomId: RoomIdentifier
    message: string
    options: SendMessageOptions
}): Promise<void> {
    const { matrixClient, roomId, message, options } = props

    const content = getMessageContent(message, options)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const cb = function (err: any, res: any) {
        if (err) {
            console.error(err)
        }
    }

    if (!options.threadId) {
        await matrixClient.sendEvent(roomId.matrixRoomId, 'm.room.message', content, '', cb)
    } else {
        // send as reply
        await matrixClient.sendEvent(
            roomId.matrixRoomId,
            options.threadId,
            'm.room.message',
            {
                ...content,
                'm.relates_to': {
                    'm.in_reply_to': {
                        event_id: options.threadId,
                    },
                },
            },
            '',
            cb,
        )
    }
}
