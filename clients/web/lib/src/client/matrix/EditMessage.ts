import { MatrixClient, RelationType } from 'matrix-js-sdk'
import { EditMessageOptions, MessageType, SendTextMessageOptions } from '../../types/matrix-types'
import { MatrixRoomIdentifier } from '../../types/room-identifier'

/**
 * https://github.com/uhoreg/matrix-doc/blob/b2457619ab3ac6199598d05a5e1b33dc51ab3ee1/proposals/2676-message-editing.md
 */
export async function editZionMessage(
    matrixClient: MatrixClient,
    roomId: MatrixRoomIdentifier,
    message: string,
    options: EditMessageOptions,
    msgOptions: SendTextMessageOptions | undefined,
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const cb = function (err: any, res: any) {
        console.log('editZionMessage:done')
        if (err) {
            console.error(err)
        }
    }

    let content = {
        body: message,
        msgtype: MessageType.Text,
        'm.new_content': {
            body: message,
            msgtype: MessageType.Text,
        },
        'm.relates_to': {
            rel_type: RelationType.Replace,
            event_id: options.originalEventId,
        },
    }

    if (msgOptions) {
        content = {
            ...content,
            ...msgOptions,
        }
    }

    // send as edit
    await matrixClient.sendEvent(roomId.networkId, 'm.room.message', content, '', cb)
}
