import React, { useMemo } from 'react'
import {
    RoomIdentifier,
    SendMessageOptions,
    ZTEvent,
    useMyProfile,
    useTimelineThread,
    useUserLookupContext,
} from 'use-zion-client'
import { firstBy } from 'thenby'
import { useLocation } from 'react-router'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Paragraph, Stack } from '@ui'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSendReply } from 'hooks/useSendReply'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useAuth } from 'hooks/useAuth'
import { useDevice } from 'hooks/useDevice'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { FullScreenMedia } from '@components/FullScreenMedia/FullScreenMedia'
import { QUERY_PARAMS } from 'routes'

export const MessageThread = (props: {
    userId: string
    channelLabel: string
    parentId: string
    channelId: RoomIdentifier
    spaceId: RoomIdentifier
}) => {
    const { parentId, spaceId, channelId, channelLabel } = props
    const { parent, messages: unthrottledMessages } = useTimelineThread(channelId, parentId)
    const parentMessage = parent?.parentEvent
    const { isTouch } = useDevice()
    const location = useLocation()
    const searchParams = new URLSearchParams(location.search)
    const galleryId = searchParams.get(QUERY_PARAMS.GALLERY_ID)
    const galleryThreadId = searchParams.get(QUERY_PARAMS.GALLERY_THREAD_ID)
    const showGallery = galleryThreadId === parentId || galleryId === parentId

    const messages = useThrottledValue(unthrottledMessages, 1000)

    const { sendReply } = useSendReply(parentId, parentMessage?.fallbackContent)

    const onSend = (value: string, options: SendMessageOptions | undefined) => {
        sendReply(value, channelId, options, parent?.userIds)
    }

    const profile = useMyProfile()

    const messagesWithParent = useMemo(
        () => (parentMessage ? [parentMessage, ...messages] : []),
        [messages, parentMessage],
    )

    const involvedUsers = useMemo(() => {
        return Object.values(
            messagesWithParent.reduce((users, m) => {
                if (m.content?.kind === ZTEvent.RoomMessage && m.sender?.id) {
                    users[m.sender.id] = {
                        userId: m.sender.id,
                        displayName: m.sender.displayName,
                    }
                }
                return users
            }, {} as { [key: string]: { userId: string; displayName: string } }),
        )
    }, [messagesWithParent])

    const usernames = useMemo(() => {
        const names = Object.values(involvedUsers)
            .map((u) => {
                const isYou = u.userId === profile?.userId
                const displayName = isYou ? 'you' : getPrettyDisplayName(u).displayName
                return displayName
            })
            .sort(firstBy((n) => n === 'you'))
        return names.length > 0
            ? names.reduce(
                  (k, c, index, arr) =>
                      k +
                      c +
                      (index === arr.length - 1 ? '' : index === arr.length - 2 ? ' and ' : ', '),
                  '',
              )
            : undefined
    }, [involvedUsers, profile?.userId])

    const { users } = useUserLookupContext()
    const userId = useMyProfile()?.userId
    const { loggedInWalletAddress } = useAuth()
    const channels = useSpaceChannels()

    const { isChannelWritable } = useIsChannelWritable(spaceId, channelId, loggedInWalletAddress)

    return parentMessage ? (
        <MessageTimelineWrapper
            events={messagesWithParent}
            spaceId={spaceId}
            channelId={channelId}
            threadParentId={parentId}
        >
            <>
                <Stack gap={{ touch: 'none', default: 'md' }}>
                    <Box paddingX={{ touch: 'md', default: 'none' }} paddingTop="sm">
                        <Paragraph size="lg" color="default">
                            #{channelLabel.toLocaleLowerCase()}
                        </Paragraph>
                        {usernames && <Paragraph color="gray2">{usernames}</Paragraph>}
                    </Box>
                    <Stack elevate={!isTouch} rounded="md" boxShadow="none">
                        <MessageTimeline
                            collapsed
                            displayAsSimpleList
                            align="top"
                            groupByUser={false}
                        />
                        <Box
                            paddingTop="none"
                            paddingBottom="md"
                            paddingX={{ default: 'md', touch: 'none' }}
                        >
                            <RichTextEditor
                                editable={!!isChannelWritable}
                                threadId={parentId}
                                displayButtons={isTouch ? 'on-focus' : 'always'}
                                threadPreview={parentMessage?.fallbackContent}
                                storageId={`${channelId.networkId}-${parentId}`}
                                autoFocus={false}
                                placeholder="Reply..."
                                channels={channels}
                                users={users}
                                userId={userId}
                                onSend={onSend}
                            />
                        </Box>
                    </Stack>
                </Stack>
                {showGallery && <FullScreenMedia events={messagesWithParent} threadId={parentId} />}
            </>
        </MessageTimelineWrapper>
    ) : (
        <></>
    )
}
