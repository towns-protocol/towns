import { useCallback, useContext } from 'react'
import { SendTextMessageOptions, useTownsClient } from 'use-towns-client'
import { ChannelMessageEvent } from '@towns-protocol/sdk'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { trackPostedMessage } from '@components/Analytics/postedMessage'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'

export const useEditMessage = (args: { channelId?: string; spaceId?: string }) => {
    const { channelId, spaceId } = args
    const { editMessage } = useTownsClient()
    const { canReplyInline, replyToEventId } = useContext(ReplyToMessageContext)
    const spaceDetailsAnalytics = useGatherSpaceDetailsAnalytics({
        spaceId,
        channelId,
    })

    const editChannelMessage = useCallback(
        (
            { value, eventId }: { value: string; eventId: string },
            originalEventContent: ChannelMessageEvent,
            msgOptions: SendTextMessageOptions | undefined,
        ) => {
            if (value && eventId && channelId) {
                editMessage(channelId, eventId, originalEventContent, value, msgOptions)

                trackPostedMessage({
                    spaceId,
                    eventId,
                    channelId,
                    threadId: originalEventContent.threadId,
                    canReplyInline,
                    replyToEventId,
                    messageType: 'edited',
                    ...spaceDetailsAnalytics,
                })
            }
        },
        [canReplyInline, channelId, editMessage, replyToEventId, spaceDetailsAnalytics, spaceId],
    )

    return { editChannelMessage }
}
