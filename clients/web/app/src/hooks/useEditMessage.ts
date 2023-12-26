import { useCallback } from 'react'
import { RoomMessageEvent, SendTextMessageOptions, useZionClient } from 'use-zion-client'

export const useEditMessage = (channelId?: string) => {
    const { editMessage } = useZionClient()

    const editChannelEvent = useCallback(
        (
            { value, eventId }: { value: string; eventId: string },
            originalEventContent: RoomMessageEvent,
            msgOptions: SendTextMessageOptions | undefined,
        ) => {
            if (value && eventId && channelId) {
                editMessage(channelId, eventId, originalEventContent, value, msgOptions)
            }
        },
        [channelId, editMessage],
    )

    return editChannelEvent
}
