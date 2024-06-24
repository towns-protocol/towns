import { useCallback, useContext } from 'react'
import { SendMessageOptions, useTownsClient } from 'use-towns-client'
import { getChannelType, useAnalytics } from 'hooks/useAnalytics'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'

export const useChannelSend = (params: {
    channelId: string
    spaceId?: string
    threadId?: string
}) => {
    const { channelId, spaceId, threadId } = params
    const { analytics } = useAnalytics()
    const { sendMessage } = useTownsClient()
    const { replyToEventId, setReplyToEventId } = useContext(ReplyToMessageContext)
    const onSend = useCallback(
        (value: string, options: SendMessageOptions | undefined) => {
            if (!channelId) {
                return
            }

            const tracked = {
                spaceId,
                channelId,
                channelType: getChannelType(channelId),
                isThread: !!threadId,
                messageType: options?.messageType,
            }
            analytics?.track('posted message', tracked, () => {
                console.log('[analytics] posted message', tracked)
            })

            // TODO: need to pass participants to sendReply in case of thread ?
            const optionsWithThreadId = replyToEventId
                ? { ...(options ?? {}), replyId: replyToEventId }
                : options

            if (spaceId) {
                sendMessage(channelId, value, {
                    parentSpaceId: spaceId,
                    ...optionsWithThreadId,
                })
            } else {
                sendMessage(channelId, value, optionsWithThreadId)
            }

            if (replyToEventId) {
                setReplyToEventId?.(null)
            }
        },
        [channelId, analytics, spaceId, threadId, replyToEventId, sendMessage, setReplyToEventId],
    )

    return { onSend }
}
