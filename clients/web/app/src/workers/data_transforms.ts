import { EncryptedData, StreamEvent } from '@river-build/proto'
import { convert } from 'html-to-text'

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

export function htmlToText(html?: string): string | undefined {
    if (!html) {
        return
    }
    return convert(html, { preserveNewlines: true })
}
