import { useEvent } from 'react-use-event-hook'
import { useTownsClient } from 'use-towns-client'
import { useRouteParams } from './useRouteParams'

export const useHandleReaction = (channelId: string) => {
    const { sendReaction, redactEvent } = useTownsClient()
    const { threadId } = useRouteParams()

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
                sendReaction(channelId, action.parentId, action.reactionName, threadId)
            } else if (action.type === 'redact') {
                redactEvent(channelId, action.eventId)
            }
        },
    )
    return handleReaction
}
