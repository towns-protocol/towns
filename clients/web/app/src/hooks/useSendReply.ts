import { useCallback } from 'react'
import { RoomIdentifier, SendMessageOptions, useZionClient } from 'use-zion-client'

export const useSendReply = (threadId?: string) => {
    const { sendMessage } = useZionClient()

    const sendReply = useCallback(
        (value: string, channelId: RoomIdentifier, options: SendMessageOptions | undefined) => {
            if (value) {
                sendMessage(channelId, value, { ...options, threadId })
            }
            return sendReply
        },
        [threadId, sendMessage],
    )

    return { sendReply }
}
