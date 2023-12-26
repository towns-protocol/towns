import { useEvent } from 'react-use-event-hook'
import { useZionClient } from 'use-zion-client'

export const useHandleReaction = (channelId: string) => {
    const { sendReaction, redactEvent } = useZionClient()
    const handleReaction = useEvent(
        (
            action:
                | {
                      type: 'add'
                      parentId: string
                      reactionName: string
                  }
                | {
                      type: 'redact'
                      eventId: string
                  },
        ) => {
            if (action.type === 'add') {
                sendReaction(channelId, action.parentId, action.reactionName)
            } else if (action.type === 'redact') {
                redactEvent(channelId, action.eventId)
            }
        },
    )
    return handleReaction
}
