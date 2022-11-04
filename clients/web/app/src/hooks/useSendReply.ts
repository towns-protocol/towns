import { useCallback } from 'react'
import { RoomIdentifier, useZionClient } from 'use-zion-client'
import { contentWithUrlsAttached } from '@components/RichText/utils/textParsers'

export const useSendReply = (threadId?: string) => {
    const { sendMessage } = useZionClient()

    const sendReply = useCallback(
        (value: string, channelId: RoomIdentifier) => {
            if (value) {
                sendMessage(channelId, value, {
                    threadId: threadId,
                    ...contentWithUrlsAttached(value),
                })
            }
            return sendReply
        },
        [threadId, sendMessage],
    )

    return { sendReply }
}
