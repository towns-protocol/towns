import { useCallback, useContext } from 'react'
import { SendMessageOptions, useTownsClient } from 'use-towns-client'
import {
    Analytics,
    getChannelType,
    getPostedMessageType,
    getThreadReplyOrDmReply,
} from 'hooks/useAnalytics'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { useSlashCommand } from 'hooks/useSlashCommand'

export const useChannelSend = (params: {
    channelId: string
    spaceId?: string
    threadId?: string
}) => {
    const { channelId, spaceId, threadId } = params
    const { sendMessage } = useTownsClient()
    const { canReplyInline, replyToEventId, setReplyToEventId } = useContext(ReplyToMessageContext)
    const { parseAndExecuteCommand } = useSlashCommand()

    const onSend = useCallback(
        (value: string, options: SendMessageOptions | undefined, filesCount: number = 0) => {
            if (!channelId) {
                return
            }

            if (parseAndExecuteCommand(value)) {
                return
            }

            const tracked = {
                spaceId,
                channelId,
                channelType: getChannelType(channelId),
                reply: getThreadReplyOrDmReply({
                    threadId,
                    canReplyInline,
                    replyToEventId,
                }),
                messageType: getPostedMessageType(value, {
                    messageType: options?.messageType,
                    filesCount,
                }),
            }
            Analytics.getInstance().track('posted message', tracked, () => {
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
        [
            channelId,
            parseAndExecuteCommand,
            spaceId,
            threadId,
            canReplyInline,
            replyToEventId,
            sendMessage,
            setReplyToEventId,
        ],
    )

    return { onSend }
}
