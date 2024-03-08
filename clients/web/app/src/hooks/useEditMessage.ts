import { useCallback } from 'react'
import { RoomMessageEvent, SendTextMessageOptions, useTownsClient } from 'use-towns-client'

export const useEditMessage = (channelId?: string) => {
    const { editMessage } = useTownsClient()

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
