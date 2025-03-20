import { useSpaceDataStore } from 'use-towns-client'
import { MessageType } from '@towns-protocol/sdk'
import { Analytics, getChannelType } from 'hooks/useAnalytics'
import { isEmoji } from 'utils/isEmoji'
import { getExternalLinks } from 'hooks/useExtractInternalLinks'
import { useGatherSpaceDetailsAnalytics } from './useGatherSpaceDetailsAnalytics'

export type PostedMessageOptions = {
    messageType?: MessageType | 'emoji reaction' | 'gif' | 'redacted' | 'admin redacted' | 'edited'
    filesCount?: number
}

export function getPostedMessageType(
    value: string,
    { messageType, filesCount = 0 }: PostedMessageOptions,
) {
    return isEmoji(value) ? 'emoji' : isUrl(value) ? 'link' : filesCount > 0 ? 'file' : messageType // last option
}

export type PostedMessage = {
    spaceId: string | undefined
    channelId: string
    messageType: ReturnType<typeof getPostedMessageType>
    threadId: string | undefined
    canReplyInline: boolean | undefined
    replyToEventId: string | undefined | null
    eventId?: string
    emojiId?: string
} & ReturnType<typeof useGatherSpaceDetailsAnalytics>

export const trackPostedMessage = (tr: PostedMessage) => {
    const tracked: PostedMessage & {
        spaceName?: string
        channelType: ReturnType<typeof getChannelType>
        reply: ReturnType<typeof getThreadReplyOrDmReply>
    } = {
        ...tr,
        spaceName: tr.spaceId
            ? useSpaceDataStore.getState().spaceDataMap?.[tr.spaceId]?.name
            : undefined,
        channelType: getChannelType(tr.channelId),
        reply: getThreadReplyOrDmReply({
            threadId: tr.threadId,
            canReplyInline: tr.canReplyInline,
            replyToEventId: tr.replyToEventId,
        }),
    }
    Analytics.getInstance().track('posted message', tracked)
}

function isUrl(value: string): boolean {
    const urls = getExternalLinks(value)
    return urls.length > 0
}

export function getThreadReplyOrDmReply({
    threadId,
    canReplyInline,
    replyToEventId,
}: {
    threadId?: string
    canReplyInline?: boolean
    replyToEventId?: string | null
}): 'directly reply' | 'thread reply' | '' {
    const dmReply = canReplyInline && replyToEventId
    return dmReply ? 'directly reply' : threadId ? 'thread reply' : ''
}
