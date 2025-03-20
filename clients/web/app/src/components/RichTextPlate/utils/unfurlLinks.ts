import { ChannelMessage_Post_Content_Text } from '@towns-protocol/proto'
import { isDefined, transformAttachments } from '@towns-protocol/sdk'
import { getUnfurlContent } from 'api/lib/unfurl'

export const unfurlLinksToAttachments = async (
    pending: string[],
    payload: ChannelMessage_Post_Content_Text,
) => {
    const response = await getUnfurlContent(pending)
    const data = response?.data

    if (!Array.isArray(data)) {
        return
    }

    for (const content of data) {
        if (!isDefined(content)) {
            continue
        }
        const unfurl = {
            type: 'unfurled_link',
            url: content.url,
            title: content.title ?? '',
            description: content.description ?? '',
            image: content.image,
            id: content.url,
        } as const

        const attachmentIndex = payload.attachments?.findIndex(
            (a) => a.content.case === 'unfurledUrl' && unfurl.url === a.content.value.url,
        )

        if (attachmentIndex > -1) {
            const transformedAttachments = transformAttachments([unfurl])
            payload.attachments[attachmentIndex] = transformedAttachments[0]
        }
    }
}
