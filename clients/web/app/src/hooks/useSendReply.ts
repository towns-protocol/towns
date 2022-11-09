import { useCallback } from 'react'
import { RoomIdentifier, useZionClient } from 'use-zion-client'

export const useSendReply = (threadId?: string) => {
    const { sendMessage } = useZionClient()

    const sendReply = useCallback(
        (value: string, channelId: RoomIdentifier) => {
            if (value) {
                sendMessage(channelId, value, { threadId })
            }
            return sendReply
        },
        [threadId, sendMessage],
    )

    return { sendReply }
}
