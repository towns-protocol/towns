import { ErrorBoundary } from '@sentry/react'
import React, { createContext, useCallback, useMemo } from 'react'
import {
    Channel,
    RoomIdentifier,
    TimelineEvent,
    useMyProfile,
    useSpaceMembers,
    useTimelineReactions,
    useTimelineThreadStats,
    useZionClient,
} from 'use-zion-client'
import { useNavigate } from 'react-router-dom'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { Box } from '@ui'
import { useHandleReaction } from 'hooks/useReactions'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useCreateLink } from 'hooks/useCreateLink'
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
    isChannelWritable?: boolean
    threadParentId?: string
    channels: Channel[]
    events: TimelineEvent[]
    type: MessageTimelineType
    messageRepliesMap: ReturnType<typeof useTimelineThreadStats>
    messageReactionsMap: ReturnType<typeof useTimelineReactions>
    timelineActions: ReturnType<typeof useTimelineMessageEditing>
    handleReaction: ReturnType<typeof useHandleReaction>
    sendReadReceipt: ReturnType<typeof useZionClient>['sendReadReceipt']
    membersMap: ReturnType<typeof useSpaceMembers>['membersMap']
    members: ReturnType<typeof useSpaceMembers>['members']
    onMentionClick?: (mentionName: string) => void
} | null>(null)

export const MessageTimelineWrapper = (props: {
    children: React.ReactNode
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    events: TimelineEvent[]
    threadParentId?: string
    isChannelWritable?: boolean
}) => {
    const { spaceId, channelId, events, isChannelWritable, threadParentId } = props
    const userId = useMyProfile()?.userId
    const { sendReadReceipt } = useZionClient()
    const type = threadParentId ? MessageTimelineType.Thread : MessageTimelineType.Channel
    const channels = useSpaceChannels()
    const messageRepliesMap = useTimelineThreadStats(channelId)
    const messageReactionsMap = useTimelineReactions(channelId)
    const timelineActions = useTimelineMessageEditing()
    const handleReaction = useHandleReaction(channelId)
    const isChannelEncrypted = true

    const { membersMap, members } = useSpaceMembers()

    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const onMentionClick = useCallback(
        (mentionName: string) => {
            const profileId = members?.find((m) => m.name === mentionName.trim())?.userId
            if (!profileId) {
                return
            }
            const link = createLink({ profileId })
            if (link) {
                navigate(link)
            }
        },
        [createLink, members, navigate],
    )

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
            isChannelEncrypted,
            isChannelWritable,
            messageRepliesMap,
            messageReactionsMap,
            onMentionClick,
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
        isChannelEncrypted,
        isChannelWritable,
        messageRepliesMap,
        messageReactionsMap,
        onMentionClick,
        timelineActions,
        handleReaction,
        sendReadReceipt,
        type,
        members,
        membersMap,
    ])
    return (
        <ErrorBoundary fallback={MessageTimelineFallbackComponent}>
            <MessageTimelineContext.Provider value={value}>
                {props.children}
            </MessageTimelineContext.Provider>
        </ErrorBoundary>
    )
}

const MessageTimelineFallbackComponent = (props: { error: Error }) => {
    return (
        <Box centerContent height="100%">
            <SomethingWentWrong error={props.error} />
        </Box>
    )
}
