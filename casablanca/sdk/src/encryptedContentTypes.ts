import { ChannelMessage, EncryptedData } from '@river/proto'

/*************
 * EncryptedContent
 *************/
export interface EncryptedContent {
    kind: 'text' | 'channelMessage'
    content: EncryptedData
}

/*************
 * DecryptedContent
 *************/
export interface DecryptedContent_Text {
    kind: 'text'
    content: string
}

export interface DecryptedContent_ChannelMessage {
    kind: 'channelMessage'
    content: ChannelMessage
}

export type DecryptedContent = DecryptedContent_Text | DecryptedContent_ChannelMessage
