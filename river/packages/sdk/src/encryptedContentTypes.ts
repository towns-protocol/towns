import {
    ChannelMessage,
    ChannelProperties,
    EncryptedData,
    EncryptedDataVersion,
} from '@river-build/proto'
import { checkNever, logNever } from './check'

/*************
 * EncryptedContent
 *************/
export interface EncryptedContent {
    kind: 'text' | 'channelMessage' | 'channelProperties'
    content: EncryptedData
}

export function isEncryptedContentKind(kind: string): kind is EncryptedContent['kind'] {
    return kind === 'text' || kind === 'channelMessage' || kind === 'channelProperties'
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

export interface DecryptedContent_UnsupportedContent {
    kind: 'unsupported'
    content: string | Uint8Array
}

export type DecryptedContent =
    | DecryptedContent_Text
    | DecryptedContent_ChannelMessage
    | DecryptedContent_ChannelProperties
    | DecryptedContent_UnsupportedContent

export function toDecryptedContent(
    kind: EncryptedContent['kind'],
    dataVersion: EncryptedDataVersion,
    cleartext: Uint8Array | string,
): DecryptedContent {
    switch (dataVersion) {
        case EncryptedDataVersion.ENCRYPTED_DATA_VERSION_0:
            if (typeof cleartext !== 'string') {
                throw new Error('cleartext is not a string when dataversion is 0')
            }
            switch (kind) {
                case 'text':
                    return {
                        kind,
                        content: cleartext,
                    } satisfies DecryptedContent_Text
                case 'channelMessage':
                    return {
                        kind,
                        content: ChannelMessage.fromJsonString(cleartext),
                    } satisfies DecryptedContent_ChannelMessage

                case 'channelProperties':
                    return {
                        kind,
                        content: ChannelProperties.fromJsonString(cleartext),
                    } satisfies DecryptedContent_ChannelProperties
                default:
                    // the client is responsible for this
                    // we should never have a type we don't know about locally here
                    checkNever(kind)
                    return {
                        kind: 'unsupported',
                        content: cleartext,
                    } as DecryptedContent_UnsupportedContent
            }
        case EncryptedDataVersion.ENCRYPTED_DATA_VERSION_1:
            if (typeof cleartext === 'string') {
                throw new Error('cleartext is a string when dataversion is 1')
            }
            switch (kind) {
                case 'text':
                    return {
                        kind: 'text',
                        content: new TextDecoder().decode(cleartext),
                    } satisfies DecryptedContent_Text
                case 'channelProperties':
                    return {
                        kind: 'channelProperties',
                        content: ChannelProperties.fromBinary(cleartext),
                    } satisfies DecryptedContent_ChannelProperties
                case 'channelMessage':
                    return {
                        kind: 'channelMessage',
                        content: ChannelMessage.fromBinary(cleartext),
                    } satisfies DecryptedContent_ChannelMessage
                default:
                    checkNever(kind) // local to our codebase, should never happen
                    return {
                        kind: 'unsupported',
                        content: cleartext,
                    } as DecryptedContent_UnsupportedContent
            }
        default:
            logNever(dataVersion)
            return {
                kind: 'unsupported',
                content: cleartext,
            } as DecryptedContent_UnsupportedContent
    }
}
