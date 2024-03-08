import { useEvent } from 'react-use-event-hook'
import { useTownsClient } from 'use-towns-client'

export const useHandleReaction = (channelId: string) => {
    const { sendReaction, redactEvent } = useTownsClient()
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
