import React, { createContext, useCallback, useMemo } from 'react'
import {
    Channel,
    TimelineEvent,
    useMyProfile,
    useTimelineReactions,
    useTimelineThreadStats,
    useTownsClient,
    useUserLookupContext,
} from 'use-towns-client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast/headless'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { Box } from '@ui'
import { useHandleReaction } from 'hooks/useReactions'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useCreateLink } from 'hooks/useCreateLink'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useGetAbstractAccountAddressAsync } from 'hooks/useAbstractAccountAddress'
import { ErrorNotification } from '@components/Notifications/ErrorNotifcation'
import { useTimelineMessageEditing } from './hooks/useTimelineMessageEditing'
import { useTimelineRecorder } from './hooks/useTimelineRecorder'

export enum MessageTimelineType {
    Channel = 'channel',
    Thread = 'thread',
}

export const MessageTimelineContext = createContext<{
    userId: string | undefined
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
    sendReadReceipt: ReturnType<typeof useTownsClient>['sendReadReceipt']
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
    const { sendReadReceipt } = useTownsClient()
    const type = threadParentId ? MessageTimelineType.Thread : MessageTimelineType.Channel
    const channels = useSpaceChannels()
    const messageRepliesMap = useTimelineThreadStats(channelId)
    const messageReactionsMap = useTimelineReactions(channelId)
    const timelineActions = useTimelineMessageEditing()
    const handleReaction = useHandleReaction(channelId)
    const isChannelEncrypted = true

    const { usersMap, users: members } = useUserLookupContext()
    const getAbstractAccountAddress = useGetAbstractAccountAddressAsync()

    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const onMentionClick = useCallback(
        async (mentionName: string) => {
            const profileId = members?.find(
                (m) => getPrettyDisplayName(m) === mentionName.trim(),
            )?.userId
            if (!profileId) {
                return
            }
            try {
                const abstractAccountAddress = await getAbstractAccountAddress({
                    rootKeyAddress: profileId,
                })
                const link = createLink({ profileId: abstractAccountAddress })
                if (link) {
                    navigate(link)
                }
            } catch (error) {
                console.error('Error navigating to user profile', error)
                toast.custom((t) => {
                    return (
                        <ErrorNotification
                            toast={t}
                            errorMessage={"There was an error navigating to this users's profile."}
                        />
                    )
                })
            }
        },
        [createLink, getAbstractAccountAddress, members, navigate],
    )

    const value = useMemo(() => {
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
