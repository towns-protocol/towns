import React, { useMemo } from 'react'
import {
    Channel,
    LookupUser,
    RoomMessageMissingEvent,
    SendMessageOptions,
    TimelineEvent,
    ZTEvent,
    useConnectivity,
    useMyProfile,
    useSpaceMembers,
    useTimelineThread,
    useUserLookupContext,
} from 'use-towns-client'
import { firstBy } from 'thenby'
import { Link, useSearchParams } from 'react-router-dom'
import { isDefined } from '@river-build/sdk'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichTextPlate/PlateEditor'
import { Box, Paragraph, Stack } from '@ui'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSendReply } from 'hooks/useSendReply'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useDevice } from 'hooks/useDevice'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { FullScreenMedia } from '@components/FullScreenMedia/FullScreenMedia'
import { QUERY_PARAMS } from 'routes'
import { useCreateLink } from 'hooks/useCreateLink'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'

export const MessageThread = (props: {
    userId: string
    channelLabel: string
    parentId: string
    channelId: string
    spaceId: string
    spaceChannels: Channel[]
}) => {
    const { parentId, spaceId, channelId, channelLabel, spaceChannels: channels } = props
    const { parent, messages: unthrottledMessages } = useTimelineThread(channelId, parentId)
    let parentMessage = parent?.parentEvent

    if (parent && !parentMessage) {
        parentMessage = {
            eventId: parentId,
            eventNum: 0n,
            createdAtEpochMs: 0,
            fallbackContent: '',
            isEncrypting: false,
            isLocalPending: false,
            isSendFailed: false,
            isMentioned: false,
            isRedacted: false,
            sender: { id: '', displayName: '' },
            content: {
                kind: ZTEvent.RoomMessageMissing,
                eventId: parentId,
            } satisfies RoomMessageMissingEvent,
        } satisfies TimelineEvent
    }

    const { isTouch } = useDevice()
    const [searchParams] = useSearchParams()
    const galleryId = searchParams.get(QUERY_PARAMS.GALLERY_ID)
    const galleryThreadId = searchParams.get(QUERY_PARAMS.GALLERY_THREAD_ID)
    const showGallery = galleryThreadId === parentId || galleryId === parentId

    const messages = useThrottledValue(unthrottledMessages, 1000)
    const { lookupUser } = useUserLookupContext()

    const { sendReply } = useSendReply(parentId, parentMessage?.fallbackContent)

    const onSend = (value: string, options: SendMessageOptions | undefined) => {
        const userIds = parent?.userIds ?? new Set<string>()
        if (parent?.parentEvent) {
            userIds.add(parent.parentEvent.sender.id)
        }
        sendReply(value, channelId, options, userIds)
    }

    const profile = useMyProfile()

    const messagesWithParent = useMemo(
        () => (parentMessage ? [parentMessage, ...messages] : []),
        [messages, parentMessage],
    )

    const involvedUsers = useMemo(() => {
        const userIds = messagesWithParent
            .filter((m) => m.content?.kind === ZTEvent.RoomMessage)
            .map((m) => m.sender?.id)
            .filter((id) => id)

        return userIds.reduce((users, id) => {
            users[id] = lookupUser(id)
            return users
        }, {} as { [key: string]: LookupUser | undefined })
    }, [lookupUser, messagesWithParent])

    const usernames = useMemo(() => {
        const names = Object.values(involvedUsers)
            .filter(isDefined)
            .map((u) => {
                const isYou = u.userId === profile?.userId
                const displayName = isYou ? 'you' : getPrettyDisplayName(u)
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

    const { memberIds } = useSpaceMembers()
    const userId = useMyProfile()?.userId
    const { loggedInWalletAddress } = useConnectivity()

    const { isChannelWritable } = useIsChannelWritable(spaceId, channelId, loggedInWalletAddress)

    const { createLink } = useCreateLink()

    return parentMessage ? (
        <MessageTimelineWrapper
            events={messagesWithParent}
            spaceId={spaceId}
            channelId={channelId}
            threadParentId={parentId}
        >
            <>
                <Stack gap={{ touch: 'none', default: 'md' }}>
                    <Box paddingX={{ touch: 'md', default: 'none' }}>
                        <Paragraph color="default">
                            <Link
                                to={createLink({ spaceId, channelId, threadId: parentId }) ?? `#`}
                            >
                                #{channelLabel.toLocaleLowerCase()}
                            </Link>
                        </Paragraph>

                        {usernames && <Paragraph color="gray2">{usernames}</Paragraph>}
                    </Box>
                    <Stack
                        elevate={!isTouch}
                        rounded="md"
                        boxShadow="none"
                        position="relative"
                        overflow="hidden"
                    >
                        <MediaDropContextProvider title="" channelId={channelId} spaceId={spaceId}>
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
                                    key={`${parentId}-${isChannelWritable ? '' : '-readonly'}`}
                                    editable={!!isChannelWritable}
                                    threadId={parentId}
                                    displayButtons={isTouch ? 'on-focus' : 'always'}
                                    threadPreview={parentMessage?.fallbackContent}
                                    storageId={`${channelId}-${parentId}`}
                                    autoFocus={false}
                                    placeholder="Reply..."
                                    channels={channels}
                                    memberIds={memberIds}
                                    userId={userId}
                                    onSend={onSend}
                                />
                            </Box>
                        </MediaDropContextProvider>
                    </Stack>
                </Stack>
                {showGallery && <FullScreenMedia events={messagesWithParent} threadId={parentId} />}
            </>
        </MessageTimelineWrapper>
    ) : (
        <></>
    )
}
