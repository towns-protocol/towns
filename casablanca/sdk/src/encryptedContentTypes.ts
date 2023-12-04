import { ChannelMessage, EncryptedData } from '@river/proto'

/*************
 * EncryptedContent
 *************/
export interface EncryptedContent_ChannelMessage {
    kind: 'channelMessage'
    content: EncryptedData
}

export type EncryptedContent =
    EncryptedContent_ChannelMessage /* todo add more type types to this union */

/*************
 * DecryptedContent
 *************/
export interface DecryptedContent_ChannelMessage {
    kind: 'channelMessage'
    content: ChannelMessage
}

export type DecryptedContent =
    DecryptedContent_ChannelMessage /* todo add more type types to this union */
