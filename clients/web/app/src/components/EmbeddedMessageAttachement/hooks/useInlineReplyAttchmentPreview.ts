import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useChannelId, useRawTimelineStore, useUserLookupContext } from 'use-towns-client'
import { RiverTimelineEvent } from '@towns-protocol/sdk'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

export const useInlineReplyAttchmentPreview = (params?: { onNewInlineReply?: () => void }) => {
    const { replyToEventId, setReplyToEventId } = useContext(ReplyToMessageContext)

    const cancelInlineReply = useCallback(() => {
        setReplyToEventId?.(null)
    }, [setReplyToEventId])

    // assuming inline replies are always tied to the current channel
    const channelId = useChannelId()

    // lookup message content to create preview
    const parentEvent = useRawTimelineStore((state) => {
        if (replyToEventId) {
            const event = state.timelines[channelId]?.find((e) => e.eventId === replyToEventId)
            if (event?.content?.kind === RiverTimelineEvent.ChannelMessage) {
                return {
                    event,
                    eventContent: event.content,
                }
            }
        }
    })

    const { lookupUser } = useUserLookupContext()
    const inlineReply = useMemo(() => {
        if (parentEvent) {
            return {
                ...parentEvent,
                displayName: getPrettyDisplayName(lookupUser(parentEvent.event.sender.id)),
            }
        }
    }, [lookupUser, parentEvent])

    const onNewInlineReplyRef = useRef(params?.onNewInlineReply)
    onNewInlineReplyRef.current = params?.onNewInlineReply

    useEffect(() => {
        if (replyToEventId && onNewInlineReplyRef.current) {
            onNewInlineReplyRef.current()
        }
    }, [replyToEventId])

    return { inlineReplyPreview: inlineReply, onCancelInlineReply: cancelInlineReply }
}
