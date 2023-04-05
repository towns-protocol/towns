import { MatrixClient, RelationType } from 'matrix-js-sdk'
import { MessageType, SendTextMessageOptions } from '../../types/zion-types'
import { MatrixRoomIdentifier } from '../../types/room-identifier'
import { RoomMessageEvent } from '../../types/timeline-types'
import { editMessageContent } from './SendMessage'

/**
 * https://github.com/uhoreg/matrix-doc/blob/b2457619ab3ac6199598d05a5e1b33dc51ab3ee1/proposals/2676-message-editing.md
 */
export async function editZionMessage(
    matrixClient: MatrixClient,
    roomId: MatrixRoomIdentifier,
    originalEventId: string,
    originalEventContent: RoomMessageEvent,
    message: string,
    options: SendTextMessageOptions | undefined,
) {
    const content = {
        body: message,
        msgtype: MessageType.Text,
        'm.new_content': editMessageContent(message, originalEventContent.content, options ?? {}),
        'm.relates_to': {
            rel_type: RelationType.Replace,
            event_id: originalEventId,
        },
    }

    // send as edit
    await matrixClient.sendEvent(roomId.networkId, 'm.room.message', content, '')
}
