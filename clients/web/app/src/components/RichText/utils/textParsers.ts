import getUrlsLib from 'get-urls'
import { MessageType, ZionTextMessageContent } from 'use-zion-client/dist/types/matrix-types'

export const getUrls = (text: string) =>
    getUrlsLib(text, {
        requireSchemeOrWww: true,
        forceHttps: true,
    })

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
