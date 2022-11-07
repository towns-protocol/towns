import { MessageType, ZionTextMessageContent } from 'use-zion-client/dist/types/matrix-types'

// TODO: get-urls broke stuff b/c of deps
export const getUrls = (_text: string) => ''

export const contentWithUrlsAttached = (text: string) => {
    const attachments = Array.from(getUrls(text)).map((url) => ({ url }))
    const content: ZionTextMessageContent = {
        messageType: MessageType.ZionText,
    }
    if (attachments.length) {
        content.attachments = attachments
    }
    return content
}
