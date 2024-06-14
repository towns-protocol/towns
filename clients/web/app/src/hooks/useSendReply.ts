import { useCallback } from 'react'
import { SendMessageOptions, useChannelData, useTownsClient } from 'use-towns-client'

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
