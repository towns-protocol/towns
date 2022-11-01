import React, { createContext, useMemo } from 'react'
import {
    RoomIdentifier,
    TimelineEvent,
    useMatrixStore,
    useSpaceMembers,
    useZionClient,
} from 'use-zion-client'
import { useTimelineRepliesMap } from 'hooks/useFixMeMessageThread'
import { useHandleReaction, useTimelineReactionsMap } from 'hooks/useReactions'
import { useTimelineMessageEditing } from './hooks/useTimelineMessageEditing'

export enum MessageTimelineType {
    Channel = 'channel',
    Thread = 'thread',
}

export const MessageTimelineContext = createContext<{
    userId: string
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    events: TimelineEvent[]
    type: MessageTimelineType
    messageRepliesMap: ReturnType<typeof useTimelineRepliesMap>
    messageReactionsMap: ReturnType<typeof useTimelineReactionsMap>
    timelineActions: ReturnType<typeof useTimelineMessageEditing>
    handleReaction: ReturnType<typeof useHandleReaction>
    sendReadReceipt: ReturnType<typeof useZionClient>['sendReadReceipt']
    membersMap: ReturnType<typeof useSpaceMembers>['membersMap']
} | null>(null)

export const MessageTimelineWrapper = (props: {
    children: React.ReactNode
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    events: TimelineEvent[]
    type?: MessageTimelineType
}) => {
    const { spaceId, channelId, events, type = MessageTimelineType.Channel } = props
    const { userId } = useMatrixStore()

    const { sendReadReceipt } = useZionClient()
    const messageRepliesMap = useTimelineRepliesMap(events)
    const messageReactionsMap = useTimelineReactionsMap(events)
    const timelineActions = useTimelineMessageEditing()
    const handleReaction = useHandleReaction(channelId)
    const { membersMap } = useSpaceMembers()

    const value = useMemo(() => {
        if (!userId) {
            return null
        }
        return {
            userId,
            spaceId,
            channelId,
            events,
            messageRepliesMap,
            messageReactionsMap,
            timelineActions,
            handleReaction,
            sendReadReceipt,
            type,
            membersMap,
        }
    }, [
        membersMap,
        channelId,
        events,
        handleReaction,
        messageReactionsMap,
        messageRepliesMap,
        sendReadReceipt,
        spaceId,
        timelineActions,
        type,
        userId,
    ])
    return (
        <MessageTimelineContext.Provider value={value}>
            {props.children}
        </MessageTimelineContext.Provider>
    )
}
