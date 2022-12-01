import { Allotment } from 'allotment'
import React, { useEffect } from 'react'
import { generatePath, useNavigate, useOutlet, useParams } from 'react-router'
import { Link } from 'react-router-dom'
import { firstBy } from 'thenby'
import {
    Channel,
    ChannelContextProvider,
    RoomIdentifier,
    RoomMember,
    ThreadResult,
    useMatrixStore,
    useSpaceId,
    useSpaceMembers,
    useSpaceThreadRoots,
    useTimelineThread,
} from 'use-zion-client'
import { Message } from '@components/Message'
import { TimelineMessageContent } from '@components/MessageTimeline/events/TimelineMessagesContent'
import { Box, Paragraph, Stack } from '@ui'
import { usePersistOrder } from 'hooks/usePersistOrder'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { useSpaceChannels } from 'hooks/useSpaceChannels'

export const SpaceThreadsInbox = () => {
    const outlet = useOutlet()
    const { sizes, onSizesChange } = usePersistPanes(['thread-inbox', 'thread-inbox-replies'])
    const { userId } = useMatrixStore()
    const spaceId = useSpaceId()
    const threadRoots = useSpaceThreadRoots()
    const channels = useSpaceChannels()
    const { members } = useSpaceMembers()
    const { messageId } = useParams()

    const navigate = useNavigate()

    useEffect(() => {
        if (!outlet && threadRoots[0] && spaceId) {
            const threadId = threadRoots[0].thread.parentId
            const channelId = threadRoots[0].channel.id

            navigate(
                generatePath('/spaces/:spaceId/threads/:channelId/:threadId/', {
                    spaceId: spaceId.slug,
                    channelId: channelId.slug,
                    threadId,
                }),
            )
        }
    }, [navigate, outlet, spaceId, threadRoots])

    const threads = usePersistOrder(threadRoots, {
        sorterFn: sortThreads,
        identityFn: (t: ThreadResult) => t.thread.parentId,
    })

    return (
        <Stack horizontal minHeight="100%">
            <Allotment onChange={onSizesChange}>
                <Allotment.Pane minSize={550}>
                    {userId && spaceId ? (
                        <Stack grow overflowY="scroll" height="100%">
                            {threads.map((t) => {
                                t.fullyReadMarker?.eventId
                                return (
                                    <ChannelContextProvider
                                        key={t.thread.parentId}
                                        channelId={t.channel.id}
                                    >
                                        <InboxEntry
                                            selected={t.thread.parentId === messageId}
                                            spaceId={spaceId}
                                            channel={t.channel}
                                            parentId={t.thread.parentId}
                                            channels={channels}
                                            members={members}
                                            isNew={t.isNew}
                                        />
                                    </ChannelContextProvider>
                                )
                            })}
                        </Stack>
                    ) : (
                        <></>
                    )}
                </Allotment.Pane>
                {outlet && (
                    <Allotment.Pane minSize={300} preferredSize={sizes[1] || 840}>
                        {outlet}
                    </Allotment.Pane>
                )}
            </Allotment>
        </Stack>
    )
}

export function sortThreads(threads: ThreadResult[]) {
    return threads.sort(
        firstBy<ThreadResult>((m) => (m.isUnread ? 0 : 1)).thenBy((a) => a.timestamp, -1),
    )
}

const InboxEntry = (props: {
    selected?: boolean
    spaceId: RoomIdentifier
    channel: Channel
    parentId: string
    channels: Channel[]
    members: RoomMember[]
    isNew: boolean
}) => {
    const { spaceId, channel, parentId, selected: isSelected, channels, members, isNew } = props
    const { parent, messages } = useTimelineThread(channel.id, parentId)
    const parentMessage = parent?.parentEvent
    const parentMessageContent = parent?.parentMessageContent
    const lastMessage = messages[messages.length - 1]

    return (
        <Link to={`${channel.id.slug}/${parentId}/`}>
            <Stack background={isSelected ? 'level2' : undefined}>
                <Message
                    relativeDate
                    listView
                    selected={isSelected}
                    paddingX="lg"
                    paddingY="lg"
                    avatar={parentMessageContent?.sender.avatarUrl}
                    userId={parentMessageContent?.sender.id}
                    channelId={channel.id}
                    spaceId={spaceId}
                    timestamp={lastMessage?.originServerTs}
                    name={parentMessageContent?.sender.displayName ?? ''}
                    channelLabel={channel.label}
                >
                    {parentMessage && parentMessageContent && (
                        <TimelineMessageContent
                            event={parentMessage}
                            eventContent={parentMessageContent}
                            members={members}
                            channels={channels}
                        />
                    )}
                    <Box
                        color={isNew ? 'etherum' : 'gray2'}
                        fontWeight={isNew ? 'strong' : undefined}
                    >
                        <Paragraph>
                            {messages.length} {messages.length === 1 ? `reply` : `replies`}
                        </Paragraph>
                    </Box>
                </Message>
            </Stack>
        </Link>
    )
}
