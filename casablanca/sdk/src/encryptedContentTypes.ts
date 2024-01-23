import { ChannelMessage, ChannelProperties, EncryptedData } from '@river/proto'
import { checkNever } from '@river/waterproof'

/*************
 * EncryptedContent
 *************/
export interface EncryptedContent {
    kind: 'text' | 'channelMessage' | 'channelProperties'
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

export interface DecryptedContent_ChannelProperties {
    kind: 'channelProperties'
    content: ChannelProperties
}

export type DecryptedContent =
    | DecryptedContent_Text
    | DecryptedContent_ChannelMessage
    | DecryptedContent_ChannelProperties

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

        case 'channelProperties':
            return {
                kind,
                content: ChannelProperties.fromJsonString(content),
            } satisfies DecryptedContent_ChannelProperties
        default:
            // the client is responsible for this
            // we should never have a type we don't know about locally here
            checkNever(kind)
    }
}

export interface DecryptedContentError {
    missingSession: boolean
    encryptedContent: EncryptedContent
    error?: unknown
}
