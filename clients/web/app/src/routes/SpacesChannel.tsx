import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import React, {
    MutableRefObject,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useInView } from 'react-intersection-observer'
import { Outlet, useLocation, useParams } from 'react-router'
import {
    Channel,
    ChannelContextProvider,
    Membership,
    SendMessageOptions,
    useChannelData,
    useChannelTimeline,
    useConnectivity,
    useDMData,
    useMyMembership,
    useMyProfile,
    useSpaceMembers,
    useTownsClient,
} from 'use-towns-client'
import { useHotkeys } from 'react-hotkeys-hook'
import debug from 'debug'
import { useSearchParams } from 'react-router-dom'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'
import { ChannelIntro } from '@components/ChannelIntro'
import { FullScreenMedia } from '@components/FullScreenMedia/FullScreenMedia'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichTextPlate/PlateEditor'
import { RegisterChannelShortcuts } from '@components/Shortcuts/RegisterChannelShortcuts'
import { useUserList } from '@components/UserList/UserList'
import { Box, Button, Heading, Icon, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { QUERY_PARAMS } from 'routes'
import { notUndefined } from 'ui/utils/utils'
import { SECOND_MS } from 'data/constants'
import { ReplyContextProvider } from '@components/ReplyToMessageContext/ReplyToMessageProvider'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { useBlockedUsers } from 'hooks/useBlockedUsers'
import { TouchPanelContext } from '@components/Panel/Panel'
import { getChannelType, useAnalytics } from 'hooks/useAnalytics'
import { getDraftDMStorageId } from 'utils'
import { useNotificationSettings } from 'hooks/useNotificationSettings'

type Props = {
    onTouchClose?: () => void
    channelId?: string
    preventAutoFocus?: boolean
    hideHeader?: boolean
}

export const SpacesChannel = (props: Props) => {
    return (
        <SpaceChannelWrapper channelId={props.channelId}>
            <SpacesChannelComponent {...props} />
        </SpaceChannelWrapper>
    )
}

export const SpacesChannelRoute = () => {
    return (
        <SpaceChannelWrapper>
            <Outlet />
        </SpaceChannelWrapper>
    )
}

export const SpaceChannelWrapper = (
    props: { children: React.ReactElement } & { channelId?: string },
) => {
    const { channelSlug } = useParams()
    const channelId = props.channelId ?? channelSlug
    const isDmOrGDM =
        channelId && (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId))

    if (!channelId) {
        return <>SpacesChannel Route expects a channelSlug</>
    }
    return (
        <ChannelContextProvider channelId={channelId}>
            <ReplyContextProvider key={channelId} canReplyInline={!!isDmOrGDM}>
                {props.children}
            </ReplyContextProvider>
        </ChannelContextProvider>
    )
}

export const SpacesChannelComponent = (props: Props) => {
    const { messageId: threadId } = useParams()
    const { isTouch } = useDevice()
    const { replyToEventId, setReplyToEventId } = useContext(ReplyToMessageContext)
    const { client, joinRoom, leaveRoom, scrollback, sendMessage, setHighPriorityStreams } =
        useTownsClient()

    const { spaceId, channelId, channel } = useChannelData()

    const location = useLocation()
    const [searchParams] = useSearchParams()
    const galleryId = searchParams.get(QUERY_PARAMS.GALLERY_ID)
    const galleryThreadId = searchParams.get(QUERY_PARAMS.GALLERY_THREAD_ID)
    const myMembership = useMyMembership(channelId)

    const { timeline: channelMessages } = useChannelTimeline()
    const { analytics } = useAnalytics()
    const { channelSettings, addChannelNotificationSettings } = useNotificationSettings()

    useEffect(() => {
        if (channelId && !channelSettings?.some((c) => c.channelId === channelId)) {
            addChannelNotificationSettings({
                channelId,
                spaceId,
            })
        }
    }, [addChannelNotificationSettings, channelId, channelSettings, spaceId])

    const onSend = useCallback(
        (value: string, options: SendMessageOptions | undefined) => {
            if (!channelId) {
                return
            }

            const tracked = {
                spaceId,
                channelId,
                channelType: getChannelType(channelId),
                isThread: !!threadId,
                messageType: options?.messageType,
            }
            analytics?.track('posted message', tracked, () => {
                console.log('[analytics] posted message', tracked)
            })

            // TODO: need to pass participants to sendReply in case of thread ?
            const optionsWithThreadId = replyToEventId
                ? { ...(options ?? {}), replyId: replyToEventId }
                : options

            if (spaceId) {
                sendMessage(channelId, value, {
                    parentSpaceId: spaceId,
                    ...optionsWithThreadId,
                })
            } else {
                sendMessage(channelId, value, optionsWithThreadId)
            }

            if (replyToEventId) {
                setReplyToEventId?.(null)
            }
        },
        [channelId, analytics, spaceId, threadId, replyToEventId, sendMessage, setReplyToEventId],
    )

    useEffect(() => {
        if (!client) {
            return
        }
        const streamIds = spaceId ? [channelId, spaceId] : [channelId]
        console.log('Set High Priority Streams', streamIds)
        if (channelId) {
            setHighPriorityStreams(streamIds)
        }
    }, [client, spaceId, channelId, setHighPriorityStreams])

    const onJoinChannel = useCallback(() => {
        joinRoom(channelId)
    }, [joinRoom, channelId])

    const onLeaveChannel = useCallback(() => {
        leaveRoom(channelId)
    }, [leaveRoom, channelId])

    const hasThreadOpen = !!threadId

    const highlightId = useMemo(() => {
        const eventHash = location.hash?.replace(/^#/, '')
        return eventHash?.match(/^[a-z0-9_-]{16,128}/i)
            ? channelMessages.some((m) => m.eventId === eventHash)
                ? eventHash
                : undefined
            : undefined
    }, [channelMessages, location.hash])

    const { loggedInWalletAddress } = useConnectivity()
    const userId = useMyProfile()?.userId

    const channels = useSpaceChannels()

    const isDmOrGDM = isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)

    const isChannelWritable = !!useIsChannelWritable(
        isDmOrGDM ? undefined : spaceId,
        channelId,
        loggedInWalletAddress,
    )?.isChannelWritable

    const { counterParty, data } = useDMData(channelId)
    const userIds = useMemo(
        () => (data?.isGroup ? data.userIds : [counterParty].filter(notUndefined)),
        [counterParty, data?.isGroup, data?.userIds],
    )

    const userList = useUserList({ excludeSelf: true, userIds }).join('')

    const isDm = isDMChannelStreamId(channelId)
    const isUserBlocked = useBlockedUsers()
    const isBlocked = useMemo(
        () => isDm && counterParty && isUserBlocked(counterParty),
        [isDm, counterParty, isUserBlocked],
    )
    const { placeholder, imageUploadTitle } = useMessageFieldPlaceholders({
        channelId,
        channelLabel: channel?.label,
        isChannelWritable,
        isDmOrGDM,
        userList,
    })

    const onLoadMore = useCallback(() => {
        scrollback(channelId)
    }, [channelId, scrollback])

    // scrollback handling
    // i.e. loads more messages when the first message enters the viewport
    const timelineContainerRef = useRef<HTMLDivElement>(null)
    const watermarkRef = useRef<string | undefined>(undefined)
    const onFirstMessageReached = useCallback(
        (watermark: string) => {
            if (watermark === watermarkRef.current) {
                return
            }
            watermarkRef.current = watermark
            setTimeout(onLoadMore, 0)
        },
        [onLoadMore],
    )

    const showJoinChannel =
        ((myMembership && myMembership !== Membership.Join) || !myMembership) && !isDmOrGDM

    const showDMAcceptInvitation = myMembership === Membership.Invite && isDmOrGDM

    const triggerClose = useContext(TouchPanelContext)?.triggerPanelClose

    const { memberIds } = useSpaceMembers()

    return (
        <>
            {!isTouch && <RegisterChannelShortcuts />}
            {channel && showJoinChannel ? (
                <UnjoinedChannelComponent
                    channel={channel}
                    spaceId={spaceId}
                    triggerClose={triggerClose}
                    hideHeader={props.hideHeader}
                    onJoinChannel={onJoinChannel}
                />
            ) : (
                <MediaDropContextProvider
                    key={channelId}
                    title={imageUploadTitle}
                    channelId={channelId}
                    spaceId={spaceId}
                    disableDrop={!isChannelWritable}
                >
                    <MessageTimelineWrapper
                        key={channelId}
                        spaceId={spaceId}
                        channelId={channelId}
                        events={channelMessages}
                        isChannelWritable={isChannelWritable}
                    >
                        {channel && !props.hideHeader && (
                            <ChannelHeader
                                channel={channel}
                                spaceId={spaceId}
                                onTouchClose={triggerClose}
                            />
                        )}

                        <MessageTimeline
                            align="bottom"
                            containerRef={timelineContainerRef}
                            header={
                                channel && (
                                    <ChannelIntro
                                        name={channel.label}
                                        roomIdentifier={channel.id}
                                    />
                                )
                            }
                            prepend={
                                <>
                                    <ScrollbackMarker
                                        containerRef={timelineContainerRef}
                                        watermark={channelMessages.at(0)?.eventId}
                                        onMarkerReached={onFirstMessageReached}
                                    />
                                </>
                            }
                            highlightId={threadId || highlightId}
                        />
                    </MessageTimelineWrapper>
                    <BoxDebugger />
                    <Box paddingBottom={isTouch ? 'none' : 'md'} paddingX={isTouch ? 'none' : 'md'}>
                        {isBlocked && counterParty ? (
                            <BlockedUserBottomBanner userId={counterParty} />
                        ) : (
                            <>
                                {!showDMAcceptInvitation && channel && userId && (
                                    <RichTextEditor
                                        isFullWidthOnTouch
                                        editable={!!isChannelWritable}
                                        background={isChannelWritable ? 'level2' : 'level1'}
                                        displayButtons={isTouch ? 'on-focus' : 'always'}
                                        key={`${channelId}-${isChannelWritable ? '' : '-readonly'}`}
                                        storageId={
                                            location.state?.fromDraft
                                                ? getDraftDMStorageId(data?.userIds)
                                                : channel.id
                                        }
                                        autoFocus={
                                            !hasThreadOpen && !isTouch && !props.preventAutoFocus
                                        }
                                        initialValue=""
                                        placeholder={placeholder}
                                        channels={channels}
                                        userId={userId}
                                        memberIds={memberIds}
                                        onSend={onSend}
                                    />
                                )}
                            </>
                        )}
                    </Box>
                </MediaDropContextProvider>
            )}

            {galleryId && (
                <FullScreenMedia events={channelMessages} threadId={galleryThreadId ?? undefined} />
            )}
            {showDMAcceptInvitation && (
                <Stack borderTop padding gap centerContent width="100%">
                    <Text fontWeight="medium">You&apos;ve been invited to a Direct Message</Text>
                    <Stack horizontal gap>
                        <Button tone="cta1" onClick={onJoinChannel}>
                            Join
                        </Button>
                        <Button tone="level2" onClick={onLeaveChannel}>
                            Ignore
                        </Button>
                    </Stack>
                </Stack>
            )}
        </>
    )
}

const UnjoinedChannelComponent = ({
    channel,
    hideHeader,
    spaceId,
    triggerClose,
    onJoinChannel,
}: {
    channel: Channel
    hideHeader?: boolean
    spaceId?: string
    triggerClose?: () => void
    onJoinChannel: () => void
}) => {
    return (
        <>
            {channel && !hideHeader && (
                <ChannelHeader channel={channel} spaceId={spaceId} onTouchClose={triggerClose} />
            )}
            <Box absoluteFill centerContent padding="lg">
                <Box centerContent gap="md">
                    <Box padding="md" color="gray2" background="level2" rounded="sm">
                        <Icon type="tag" size="square_sm" />
                    </Box>
                    <Box centerContent gap="sm">
                        <Heading level={3}>Join #{channel.label}</Heading>
                        <Paragraph textAlign="center" color="gray2">
                            You aren’t a member yet. Join to get access:
                        </Paragraph>
                    </Box>
                    <Button
                        minWidth="100"
                        size="button_sm"
                        rounded="sm"
                        hoverEffect="none"
                        tone="cta1"
                        onClick={onJoinChannel}
                    >
                        Join Channel
                    </Button>
                </Box>
            </Box>
        </>
    )
}

const ScrollbackMarker = (props: {
    containerRef?: MutableRefObject<HTMLDivElement | null>
    watermark?: string
    onMarkerReached: (watermark: string) => void
}) => {
    const { watermark, onMarkerReached, containerRef } = props
    const { inView, ref } = useInView({
        threshold: 0,
        // the `rootMargin` can be excessive, what actually counts is the
        // `viewMargin` prop of VList which toggles the visibility of the marker
        rootMargin: '5000px',
        root: containerRef?.current,
    })

    if (inView && watermark) {
        onMarkerReached(watermark)
    }
    return <Box ref={ref} />
}

const BoxDebugger = () => {
    const [isToggled, setIsToggled] = React.useState(false)
    useHotkeys(
        'b',
        () => {
            setIsToggled((prev) => !prev)
        },
        [],
        { enabled: debug.enabled('app:vlist') },
    )
    return isToggled ? <Box background="accent" width="100%" height="200" /> : <></>
}

const useMessageFieldPlaceholders = (params: {
    isChannelWritable: boolean
    channelId: string
    channelLabel?: string
    isDmOrGDM: boolean
    userList: string
}) => {
    const { isChannelWritable, channelId, channelLabel, isDmOrGDM, userList } = params

    // for a short time, we show the user the message input even if they don't
    // have permission to send messages to the channel, this is to avoid
    // glitches while switching channels

    const [isOptimisticPermission, setOptimisticPermission] = useState(true)

    useEffect(() => {
        if (!isChannelWritable && channelId) {
            setOptimisticPermission(true)
            const timeout = setTimeout(() => {
                setOptimisticPermission(false)
            }, 3 * SECOND_MS)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [channelId, isChannelWritable])

    const placeholderContent = isDmOrGDM
        ? `Send a message to ${userList}`
        : `Send a message to #${channelLabel}`

    const placeholder =
        isChannelWritable || isOptimisticPermission
            ? placeholderContent
            : isChannelWritable === false
            ? `You don't have permission to send messages to this channel`
            : `Loading permissions`

    const imageUploadTitle = isChannelWritable
        ? `Upload to #${channelLabel}`
        : isChannelWritable === false
        ? `You don't have permission to send media to this channel`
        : `Loading permissions`

    return { placeholder, imageUploadTitle }
}

const BlockedUserBottomBanner = (props: { userId: string }) => {
    const { userId } = props
    const { updateUserBlock } = useTownsClient()

    const [isRequestInFlight, setIsRequestInFlight] = useState(false)
    const onUnblockClick = useCallback(async () => {
        if (isRequestInFlight) {
            return
        }
        try {
            setIsRequestInFlight(true)
            await updateUserBlock(userId, false)
        } catch (error) {
            console.error('Failed to update user block status:', error)
        } finally {
            setIsRequestInFlight(false)
        }
    }, [isRequestInFlight, updateUserBlock, userId])

    return (
        <>
            <Stack
                horizontal
                background="level2"
                rounded="sm"
                padding="md"
                justifyContent="center"
                alignItems="center"
                maxWidth="100%"
                border="none"
                gap="md"
            >
                <Stack flexDirection="row" gap="md" alignItems="center">
                    <Paragraph color="gray2">{'You have blocked this user.'}</Paragraph>
                </Stack>
                <Box position="relative" height="x5">
                    <Button tone="cta1" onClick={onUnblockClick}>
                        Unblock
                    </Button>
                </Box>
            </Stack>
        </>
    )
}
