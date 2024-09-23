import { useCallback, useContext } from 'react'
import { RoomMessageEvent, SendTextMessageOptions, useTownsClient } from 'use-towns-client'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { Analytics, getChannelType, getThreadReplyOrDmReply } from './useAnalytics'

export const useEditMessage = (channelId?: string) => {
    const { editMessage } = useTownsClient()
    const { canReplyInline, replyToEventId } = useContext(ReplyToMessageContext)

    const editChannelMessage = useCallback(
        (
            { value, eventId }: { value: string; eventId: string },
            originalEventContent: RoomMessageEvent,
            msgOptions: SendTextMessageOptions | undefined,
        ) => {
            if (value && eventId && channelId) {
                editMessage(channelId, eventId, originalEventContent, value, msgOptions)
                Analytics.getInstance().track('posted message', {
                    eventId,
                    channelId,
                    channelType: getChannelType(channelId),
                    reply: getThreadReplyOrDmReply({
                        threadId: originalEventContent.threadId,
                        canReplyInline,
                        replyToEventId,
                    }),
                    messageType: 'edited',
                })
            }
        },
        [canReplyInline, channelId, editMessage, replyToEventId],
    )

    return { editChannelMessage }
}
