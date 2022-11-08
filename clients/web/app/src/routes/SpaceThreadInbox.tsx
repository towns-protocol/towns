import { Allotment } from 'allotment'
import React, { useEffect } from 'react'
import { generatePath, useNavigate, useOutlet, useParams } from 'react-router'
import { Link } from 'react-router-dom'
import {
    Channel,
    ChannelContextProvider,
    RoomIdentifier,
    useChannelTimeline,
    useMatrixStore,
    useSpaceData,
    useSpaceId,
} from 'use-zion-client'
import { Message } from '@components/Message'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { Box, Stack } from '@ui'
import { useMessageThread, useScanChannelThreads } from 'hooks/useFixMeMessageThread'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { getIsRoomMessageContent, getMessageBody } from 'utils/ztevent_util'

export const SpaceThreadsInbox = () => {
    const outlet = useOutlet()
    const { sizes, onSizesChange } = usePersistPanes(['thread-inbox', 'thread-inbox-replies'])
    const { userId } = useMatrixStore()
    const spaceId = useSpaceId()
    const data = useSpaceData()
    const channelGroups = data?.channelGroups ?? []
    const { messageId } = useParams()

    // flatmap channels
    const channels = channelGroups.reduce((channels, group) => {
        return [...channels, ...group.channels]
    }, [] as Channel[])

    const { threads } = useScanChannelThreads(channels, userId)

    const navigate = useNavigate()

    useEffect(() => {
        if (!outlet && threads[0] && spaceId) {
            const threadId = threads[0].thread.parentId
            const channelId = threads[0].channel.id

            navigate(
                generatePath('/spaces/:spaceId/threads/:channelId/:threadId/', {
                    spaceId: spaceId.slug,
                    channelId: channelId.slug,
                    threadId,
                }),
            )
        }
    }, [navigate, outlet, spaceId, threads])

    return (
        <Stack horizontal minHeight="100%">
            <Allotment onChange={onSizesChange}>
                <Allotment.Pane minSize={550}>
                    {userId && spaceId ? (
                        <Stack grow paddingY="md" overflowY="scroll" height="100%">
                            {threads.map(({ thread, channel }) => {
                                return (
                                    <ChannelContextProvider
                                        key={thread.parentId}
                                        channelId={channel.id}
                                    >
                                        <InboxEntry
                                            selected={thread.parentId === messageId}
                                            spaceId={spaceId}
                                            channelId={channel.id}
                                            parentId={thread.parentId}
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

const InboxEntry = (props: {
    selected?: boolean
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    parentId: string
}) => {
    const { spaceId, channelId, parentId, selected: isSelected } = props
    const channelMessages = useChannelTimeline()

    const { parentMessage, messages } = useMessageThread(parentId, channelMessages)

    const lastMessage = messages[messages.length - 1]
    const parentMessageContent = getIsRoomMessageContent(parentMessage)

    return (
        <Link to={`${channelId.slug}/${parentId}/`}>
            <Stack background={isSelected ? 'level2' : undefined}>
                <Message
                    relativeDate
                    listView
                    selected={isSelected}
                    paddingX="lg"
                    paddingY="lg"
                    avatar={parentMessageContent?.sender.avatarUrl}
                    userId={parentMessageContent?.sender.id}
                    channelId={channelId}
                    spaceId={spaceId}
                    timestamp={lastMessage?.originServerTs}
                    name={parentMessageContent?.sender.displayName ?? ''}
                >
                    {parentMessage && parentMessageContent && (
                        <RichTextPreview
                            content={getMessageBody(parentMessage.eventId, parentMessageContent)}
                            edited={false}
                        />
                    )}
                    <Box color="etherum" fontWeight="strong">
                        {messages.length} replies
                    </Box>
                </Message>
            </Stack>
        </Link>
    )
}
