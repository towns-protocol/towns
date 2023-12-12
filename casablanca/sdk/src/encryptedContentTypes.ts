import { ChannelMessage, EncryptedData } from '@river/proto'
import { checkNever } from './check'

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

export function toDecryptedContent(
    kind: EncryptedContent['kind'],
    content: string,
): DecryptedContent {
    switch (kind) {
        case 'text':
            return {
                kind,
                content,
            } satisfies DecryptedContent_Text
        case 'channelMessage':
            return {
                kind,
                content: ChannelMessage.fromJsonString(content),
            } satisfies DecryptedContent_ChannelMessage

        default:
            // the client is responsible for this
            // we should never have a type we don't know about locally here
            checkNever(kind)
    }
}
