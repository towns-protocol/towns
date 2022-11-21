import { useCallback } from 'react'
import { RoomIdentifier, SendTextMessageOptions, useZionClient } from 'use-zion-client'

export const useEditMessage = (channelId?: RoomIdentifier) => {
    const { editMessage } = useZionClient()

    const editChannelEvent = useCallback(
        (
            { value, parentId }: { value: string; parentId: string },
            msgOptions: SendTextMessageOptions | undefined,
        ) => {
            if (value && parentId && channelId) {
                editMessage(channelId, value, { originalEventId: parentId }, msgOptions)
            }
        },
        [channelId, editMessage],
    )

    return editChannelEvent
}
