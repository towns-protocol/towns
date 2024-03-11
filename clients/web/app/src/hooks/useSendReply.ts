import { useCallback } from 'react'
import { MessageType, SendMessageOptions, useChannelData, useTownsClient } from 'use-towns-client'

export const useSendReply = (threadId?: string, threadPreview?: string) => {
    const { sendMessage } = useTownsClient()
    const { spaceId } = useChannelData()

    const sendReply = useCallback(
        (
            message: string,
            channelId: string,
            options: SendMessageOptions | undefined,
            threadParticipants?: Set<string>,
        ) => {
            const valid =
                message.length > 0 ||
                (options?.messageType === MessageType.Text && options.attachments?.length)

            if (!valid) {
                return
            }

            if (spaceId) {
                sendMessage(channelId, message, {
                    ...options,
                    parentSpaceId: spaceId,
                    threadId,
                    threadPreview,
                    threadParticipants,
                })
            } else {
                sendMessage(channelId, message, { ...options, threadId, threadPreview })
            }
        },
        [spaceId, sendMessage, threadId, threadPreview],
    )

    return { sendReply }
}
