import { useCallback } from 'react'
import {
    RoomIdentifier,
    RoomMessageEvent,
    SendTextMessageOptions,
    useZionClient,
} from 'use-zion-client'

export const useEditMessage = (channelId?: RoomIdentifier) => {
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
