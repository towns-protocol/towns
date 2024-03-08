import { useCallback } from 'react'
import { MessageType, SendMessageOptions, useChannelData, useTownsClient } from 'use-towns-client'

export const useSendReply = (threadId?: string, threadPreview?: string) => {
    const { sendMessage } = useTownsClient()
    const { spaceId } = useChannelData()

    const sendReply = useCallback(
        (
            value: string,
            channelId: string,
            options: SendMessageOptions | undefined,
            threadParticipants?: Set<string>,
        ) => {
            const valid =
                value.length > 0 ||
                (options?.messageType === MessageType.Text && options.attachments?.length)

            if (valid && spaceId) {
                sendMessage(channelId, value, {
                    ...options,
                    parentSpaceId: spaceId,
                    threadId,
                    threadPreview,
                    threadParticipants,
                })
            } else if (valid) {
                sendMessage(channelId, value, { ...options, threadId, threadPreview })
            }
            return sendReply
        },
        [spaceId, sendMessage, threadId, threadPreview],
    )

    return { sendReply }
}
