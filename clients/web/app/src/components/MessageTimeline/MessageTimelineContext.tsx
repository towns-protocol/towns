import React, { createContext, useCallback, useMemo } from 'react'
import {
    Channel,
    TimelineEvent,
    useMyProfile,
    usePins,
    useSpaceMembers,
    useTimelineReactions,
    useTimelineThreadStats,
    useTownsClient,
} from 'use-towns-client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast/headless'
import { Pin } from '@river-build/sdk'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { Box } from '@ui'
import { useHandleReaction } from 'hooks/useReactions'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useCreateLink } from 'hooks/useCreateLink'
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
    isChannelReactable?: boolean
    threadParentId?: string
    channels: Channel[]
    events: TimelineEvent[]
    type: MessageTimelineType
    messageRepliesMap: ReturnType<typeof useTimelineThreadStats>
    messageReactionsMap: ReturnType<typeof useTimelineReactions>
    timelineActions: ReturnType<typeof useTimelineMessageEditing>
    handleReaction: ReturnType<typeof useHandleReaction>
    sendReadReceipt: ReturnType<typeof useTownsClient>['sendReadReceipt']
    memberIds: string[]
    onMentionClick?: (mentionName: string) => void
    pins: Pin[] | undefined
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
    isChannelReactable?: boolean
}) => {
    const {
        spaceId,
        channelId,
        events: _events,
        isChannelWritable,
        threadParentId,
        isChannelReactable,
    } = props

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

    const { memberIds } = useSpaceMembers()
    const getAbstractAccountAddress = useGetAbstractAccountAddressAsync()

    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const pins = usePins(channelId)

    const onMentionClick = useCallback(
        async (userId: string) => {
            if (!userId) {
                return
            }
            try {
                const abstractAccountAddress = await getAbstractAccountAddress({
                    rootKeyAddress: userId as `0x${string}`,
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
        [createLink, getAbstractAccountAddress, navigate],
    )

    const value = useMemo(() => {
        return {
            channelId,
            channels,
            events,
            handleReaction,
            isChannelEncrypted,
            isChannelWritable,
            isChannelReactable,
            messageRepliesMap,
            messageReactionsMap,
            onMentionClick,
            memberIds,
            pins,
            sendReadReceipt,
            spaceId,
            threadParentId,
            timelineActions,
            type,
            userId,
        }
    }, [
        channelId,
        channels,
        events,
        handleReaction,
        isChannelEncrypted,
        isChannelWritable,
        isChannelReactable,
        messageRepliesMap,
        messageReactionsMap,
        onMentionClick,
        memberIds,
        pins,
        sendReadReceipt,
        spaceId,
        threadParentId,
        timelineActions,
        type,
        userId,
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
