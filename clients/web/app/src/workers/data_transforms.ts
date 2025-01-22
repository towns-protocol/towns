import { EncryptedData, StreamEvent } from '@river-build/proto'
import { convert } from 'html-to-text'
import { bin_toHexString } from '@river-build/dlog'
import { PlaintextDetails } from './decryptionFn'

export function getEncryptedData(data: StreamEvent): EncryptedData | undefined {
    switch (data.payload.case) {
        case 'channelPayload': {
            switch (data.payload.value.content.case) {
                case 'message':
                    return data.payload.value.content.value
                default:
                    return undefined
            }
        }
        case 'dmChannelPayload':
            switch (data.payload.value.content.case) {
                case 'message':
                    return data.payload.value.content.value
                default:
                    return undefined
            }
        case 'gdmChannelPayload':
            switch (data.payload.value.content.case) {
                case 'message':
                    return data.payload.value.content.value
                default:
                    return undefined
            }
        default:
            return undefined
    }
}

/// for non-encrypted events, we need to extract the plaintext details from the event
/// for example, tips are blockchain transactions that are not encrypted, sent as member payloads
export function getPlaintextDetailsForNonEncryptedEvents(
    data: StreamEvent,
): PlaintextDetails | undefined {
    switch (data.payload.case) {
        case 'memberPayload':
            switch (data.payload.value.content.case) {
                case 'memberBlockchainTransaction':
                    switch (data.payload.value.content.value.transaction?.content.case) {
                        case 'tip': {
                            const messageId =
                                data.payload.value.content.value.transaction.content.value.event
                                    ?.messageId
                            return {
                                body: undefined,
                                reaction: undefined,
                                refEventId: messageId ? bin_toHexString(messageId) : undefined,
                            }
                        }
                        default:
                            // ignoring other transaction content types
                            return undefined
                    }
                default:
                    // ignoring other member content types
                    return undefined
            }
        default:
            // ignoring other event types
            return undefined
    }
}

export function htmlToText(html?: string): string | undefined {
    if (!html) {
        return
    }
    return convert(html, { preserveNewlines: true })
}
