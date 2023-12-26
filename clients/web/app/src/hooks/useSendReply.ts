import { useCallback } from 'react'
import { SendMessageOptions, useChannelData, useZionClient } from 'use-zion-client'

export const useSendReply = (threadId?: string, threadPreview?: string) => {
    const { sendMessage } = useZionClient()
    const { spaceId } = useChannelData()

    const sendReply = useCallback(
        (
            value: string,
            channelId: string,
            options: SendMessageOptions | undefined,
            threadParticipants?: Set<string>,
        ) => {
            if (value && spaceId) {
                sendMessage(channelId, value, {
                    ...options,
                    parentSpaceId: spaceId,
                    threadId,
                    threadPreview,
                    threadParticipants,
                })
            } else if (value) {
                sendMessage(channelId, value, { ...options, threadId, threadPreview })
            }
            return sendReply
        },
        [spaceId, sendMessage, threadId, threadPreview],
    )

    return { sendReply }
}
