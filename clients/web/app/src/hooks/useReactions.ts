import { useEvent } from 'react-use-event-hook'
import { useTownsClient } from 'use-towns-client'
import { useContext } from 'react'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { trackPostedMessage } from '@components/Analytics/postedMessage'
import { useRouteParams } from './useRouteParams'
import { useSpaceIdFromPathname } from './useSpaceInfoFromPathname'

export const useHandleReaction = (channelId: string) => {
    const spaceId = useSpaceIdFromPathname()
    const { sendReaction, redactEvent } = useTownsClient()
    const { threadId } = useRouteParams()
    const { canReplyInline, replyToEventId } = useContext(ReplyToMessageContext)

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

                trackPostedMessage({
                    spaceId,
                    channelId,
                    messageType: 'redacted',
                    threadId,
                    canReplyInline,
                    replyToEventId,
                })
            }
        },
    )
    return handleReaction
}
