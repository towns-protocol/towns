import { useEvent } from 'react-use-event-hook'
import { useTownsClient } from 'use-towns-client'
import { useContext } from 'react'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { useRouteParams } from './useRouteParams'
import { Analytics, getChannelType, getThreadReplyOrDmReply } from './useAnalytics'

export const useHandleReaction = (channelId: string) => {
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
                Analytics.getInstance().track('posted message', {
                    channelId,
                    channelType: getChannelType(channelId),
                    reply: getThreadReplyOrDmReply({ threadId, canReplyInline, replyToEventId }),
                    messageType: 'redacted',
                })
            }
        },
    )
    return handleReaction
}
