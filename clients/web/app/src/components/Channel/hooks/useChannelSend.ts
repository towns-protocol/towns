import { useCallback, useContext } from 'react'
import { SendMessageOptions, useTownsClient } from 'use-towns-client'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { useSlashCommand } from 'hooks/useSlashCommand'
import { getPostedMessageType, trackPostedMessage } from '@components/Analytics/postedMessage'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { useTokenTrackingData } from '@components/Web3/Trading/useTradeAnalytics'

export const useChannelSend = (params: {
    channelId: string
    spaceId?: string
    threadId?: string
}) => {
    const { channelId, spaceId, threadId } = params
    const { sendMessage } = useTownsClient()
    const { canReplyInline, replyToEventId, setReplyToEventId } = useContext(ReplyToMessageContext)
    const { parseAndExecuteCommand } = useSlashCommand()
    const spaceDetailsAnalytics = useGatherSpaceDetailsAnalytics({
        spaceId,
        channelId,
    })

    const onSend = useCallback(
        (
            value: string,
            options: SendMessageOptions | undefined,
            filesCount: number = 0,
            tickerAnalytics?: ReturnType<typeof useTokenTrackingData>,
        ) => {
            if (!channelId) {
                return
            }

            if (parseAndExecuteCommand(value)) {
                return
            }

            trackPostedMessage({
                spaceId,
                channelId,
                threadId,
                canReplyInline,
                replyToEventId,
                messageType: getPostedMessageType(value, {
                    messageType: options?.messageType,
                    filesCount,
                    hasTicker: !!tickerAnalytics,
                }),
                ...spaceDetailsAnalytics,
                ...tickerAnalytics,
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
        [
            channelId,
            parseAndExecuteCommand,
            spaceId,
            threadId,
            canReplyInline,
            replyToEventId,
            sendMessage,
            setReplyToEventId,
            spaceDetailsAnalytics,
        ],
    )

    return { onSend }
}
