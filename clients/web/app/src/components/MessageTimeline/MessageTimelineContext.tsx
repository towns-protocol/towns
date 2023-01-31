import React, { createContext, useMemo } from 'react'
import {
    Channel,
    DecryptionAttempt,
    RoomIdentifier,
    TimelineEvent,
    useMatrixCredentials,
    useSpaceMembers,
    useTimelineReactions,
    useTimelineThreadStats,
    useZionClient,
} from 'use-zion-client'
import { useHandleReaction } from 'hooks/useReactions'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useTimelineMessageEditing } from './hooks/useTimelineMessageEditing'

export enum MessageTimelineType {
    Channel = 'channel',
    Thread = 'thread',
}

export const MessageTimelineContext = createContext<{
    userId: string
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    isChannelEncrypted?: boolean
    threadParentId?: string
    channels: Channel[]
    events: TimelineEvent[]
    decryptionAttempts: Record<string, DecryptionAttempt>
    type: MessageTimelineType
    messageRepliesMap: ReturnType<typeof useTimelineThreadStats>
    messageReactionsMap: ReturnType<typeof useTimelineReactions>
    timelineActions: ReturnType<typeof useTimelineMessageEditing>
    handleReaction: ReturnType<typeof useHandleReaction>
    sendReadReceipt: ReturnType<typeof useZionClient>['sendReadReceipt']
    membersMap: ReturnType<typeof useSpaceMembers>['membersMap']
    members: ReturnType<typeof useSpaceMembers>['members']
} | null>(null)

export const MessageTimelineWrapper = (props: {
    children: React.ReactNode
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    events: TimelineEvent[]
    decryptionAttempts: Record<string, DecryptionAttempt>
    threadParentId?: string
}) => {
    const { spaceId, channelId, events, threadParentId, decryptionAttempts } = props
    const { userId } = useMatrixCredentials()
    const { sendReadReceipt } = useZionClient()
    const type = threadParentId ? MessageTimelineType.Thread : MessageTimelineType.Channel
    const channels = useSpaceChannels()
    const messageRepliesMap = useTimelineThreadStats(channelId)
    const messageReactionsMap = useTimelineReactions(channelId)
    const timelineActions = useTimelineMessageEditing()
    const handleReaction = useHandleReaction(channelId)

    const { isRoomEncrypted } = useZionClient()
    const isChannelEncrypted = isRoomEncrypted(channelId)

    const { membersMap, members } = useSpaceMembers()

    const value = useMemo(() => {
        if (!userId) {
            return null
        }
        return {
            userId,
            spaceId,
            channelId,
            threadParentId,
            channels,
            events,
            decryptionAttempts,
            isChannelEncrypted,
            messageRepliesMap,
            messageReactionsMap,
            timelineActions,
            handleReaction,
            sendReadReceipt,
            type,
            members,
            membersMap,
        }
    }, [
        userId,
        spaceId,
        channelId,
        threadParentId,
        channels,
        events,
        decryptionAttempts,
        isChannelEncrypted,
        messageRepliesMap,
        messageReactionsMap,
        timelineActions,
        handleReaction,
        sendReadReceipt,
        type,
        members,
        membersMap,
    ])
    return (
        <MessageTimelineContext.Provider value={value}>
            {props.children}
        </MessageTimelineContext.Provider>
    )
}
