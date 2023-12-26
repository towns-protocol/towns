import React, { createContext, useCallback, useMemo } from 'react'
import {
    Channel,
    TimelineEvent,
    useMyProfile,
    useTimelineReactions,
    useTimelineThreadStats,
    useUserLookupContext,
    useZionClient,
} from 'use-zion-client'
import { useNavigate } from 'react-router-dom'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { Box } from '@ui'
import { useHandleReaction } from 'hooks/useReactions'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useCreateLink } from 'hooks/useCreateLink'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useTimelineMessageEditing } from './hooks/useTimelineMessageEditing'
import { useTimelineRecorder } from './hooks/useTimelineRecorder'

export enum MessageTimelineType {
    Channel = 'channel',
    Thread = 'thread',
}

export const MessageTimelineContext = createContext<{
    userId: string
    spaceId: string | undefined
    channelId: string
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
    membersMap: ReturnType<typeof useUserLookupContext>['usersMap']
    members: ReturnType<typeof useUserLookupContext>['users']
    onMentionClick?: (mentionName: string) => void
} | null>(null)

export const useTimelineContext = () => {
    const context = React.useContext(MessageTimelineContext)
    if (!context) {
        throw new Error('useTimelineContext must be used within a MessageTimelineWrapper')
    }
    return context
}

export const MessageTimelineWrapper = (props: {
    children: React.ReactNode
    spaceId: string | undefined
    channelId: string
    events: TimelineEvent[]
    threadParentId?: string
    isChannelWritable?: boolean
}) => {
    const { spaceId, channelId, events: _events, isChannelWritable, threadParentId } = props

    const events = useTimelineRecorder(_events)

    const userId = useMyProfile()?.userId
    const { sendReadReceipt } = useZionClient()
    const type = threadParentId ? MessageTimelineType.Thread : MessageTimelineType.Channel
    const channels = useSpaceChannels()
    const messageRepliesMap = useTimelineThreadStats(channelId)
    const messageReactionsMap = useTimelineReactions(channelId)
    const timelineActions = useTimelineMessageEditing()
    const handleReaction = useHandleReaction(channelId)
    const isChannelEncrypted = true

    const { usersMap, users: members } = useUserLookupContext()

    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const onMentionClick = useCallback(
        (mentionName: string) => {
            const profileId = members?.find(
                (m) => getPrettyDisplayName(m) === mentionName.trim(),
            )?.userId
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
            membersMap: usersMap,
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
        usersMap,
    ])
    return (
        <ErrorBoundary FallbackComponent={MessageTimelineFallbackComponent}>
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
