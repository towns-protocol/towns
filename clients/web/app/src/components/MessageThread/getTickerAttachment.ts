import {
    Attachment,
    RiverTimelineEvent,
    TickerAttachment,
    TimelineEvent,
} from '@towns-protocol/sdk'

const isTickerAttachment = (attachment: Attachment): attachment is TickerAttachment => {
    return attachment.type === 'ticker'
}

export const getTickerAttachment = (event?: TimelineEvent) => {
    if (event?.content?.kind !== RiverTimelineEvent.ChannelMessage) {
        return undefined
    }
    const attachments = event.content?.attachments?.filter(isTickerAttachment)

    if (attachments?.length) {
        return attachments[0]
    }

    return undefined
}
