import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import React, { MutableRefObject, useCallback, useEffect, useMemo, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { Outlet, useLocation, useParams } from 'react-router'
import {
    ChannelContextProvider,
    Membership,
    SendMessageOptions,
    useChannelData,
    useChannelTimeline,
    useDMData,
    useMyMembership,
    useMyProfile,
    useUserLookupContext,
    useZionClient,
} from 'use-zion-client'
import { useHotkeys } from 'react-hotkeys-hook'
import debug from 'debug'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'
import { ChannelIntro } from '@components/ChannelIntro'
import { FullScreenMedia } from '@components/FullScreenMedia/FullScreenMedia'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { ChannelHeaderShimmer } from '@components/Shimmer/TimelineShimmer'
import { RegisterChannelShortcuts } from '@components/Shortcuts/RegisterChannelShortcuts'
import { useUserList } from '@components/UserList/UserList'
import { Box, Button, Stack, Text } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useDevice } from 'hooks/useDevice'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { QUERY_PARAMS } from 'routes'
import { notUndefined } from 'ui/utils/utils'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

type Props = {
    onTouchClose?: () => void
}

export const SpacesChannel = (props: Props) => {
    return (
        <SpaceChannelWrapper>
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

const SpaceChannelWrapper = (props: { children: React.ReactElement }) => {
    const { channelSlug } = useParams()
    if (!channelSlug) {
        return <>SpacesChannel Route expects a channelSlug</>
    }
    return <ChannelContextProvider channelId={channelSlug}>{props.children}</ChannelContextProvider>
}

const SpacesChannelComponent = (props: Props) => {
    const { messageId } = useParams()
    const { isTouch } = useDevice()
    const { joinRoom, leaveRoom, scrollback, sendMessage } = useZionClient()

    const { spaceId, channelId, channel } = useChannelData()

    const location = useLocation()
    const searchParams = new URLSearchParams(location.search)
    const galleryId = searchParams.get(QUERY_PARAMS.GALLERY_ID)
    const galleryThreadId = searchParams.get(QUERY_PARAMS.GALLERY_THREAD_ID)
    const myMembership = useMyMembership(channelId)

    const { timeline: channelMessages } = useChannelTimeline()

    const onSend = useCallback(
        (value: string, options: SendMessageOptions | undefined) => {
            if (value && channelId && spaceId) {
                sendMessage(channelId, value, { parentSpaceId: spaceId, ...options })
            } else if (value && channelId) {
                sendMessage(channelId, value, options)
            }
        },
        [channelId, spaceId, sendMessage],
    )

    const onJoinChannel = useCallback(() => {
        joinRoom(channelId)
    }, [joinRoom, channelId])

    const onLeaveChannel = useCallback(() => {
        leaveRoom(channelId)
    }, [leaveRoom, channelId])

    const hasThreadOpen = !!messageId

    const highlightId = useMemo(() => {
        const eventHash = location.hash?.replace(/^#/, '')
        return eventHash?.match(/^[a-z0-9_-]{16,128}/i)
            ? channelMessages.some((m) => m.eventId === eventHash)
                ? eventHash
                : undefined
            : undefined
    }, [channelMessages, location.hash])

    const { users } = useUserLookupContext()

    const { loggedInWalletAddress } = useAuth()
    const userId = useMyProfile()?.userId

    const channels = useSpaceChannels()

    const { isChannelWritable } = useIsChannelWritable(spaceId, channelId, loggedInWalletAddress)

    const isDmOrGDM =
        isDMChannelStreamId(channelId.networkId) || isGDMChannelStreamId(channelId.networkId)

    const { counterParty, data } = useDMData(channelId)

    const userIds = useMemo(
        () => (data?.isGroup ? data.userIds : [counterParty].filter(notUndefined)),
        [counterParty, data?.isGroup, data?.userIds],
    )

    const userList = useUserList({ excludeSelf: true, userIds }).join('')

    const placeholderContent = isDmOrGDM
        ? `Send a message to ${userList}`
        : `Send a message to #${channel?.label}`

    const placeholder = isChannelWritable
        ? placeholderContent
        : isChannelWritable === false
        ? `You don't have permission to send messages to this channel`
        : `Loading permissions`

    const imageUploadTitle = isChannelWritable
        ? `Upload to #${channel?.label}`
        : isChannelWritable === false
        ? `You don't have permission to send media to this channel`
        : `Loading permissions`

    const onLoadMore = useCallback(() => {
        scrollback(channelId, 100)
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

    useEffect(() => {
        // load more when opening the channel
        onLoadMore()
    }, [onLoadMore])

    const showJoinChannel = myMembership !== Membership.Join && !isDmOrGDM
    const showDMAcceptInvitation = myMembership === Membership.Invite && isDmOrGDM
    return (
        <CentralPanelLayout>
            {!isTouch && <RegisterChannelShortcuts />}
            {!channel || !channelId || !myMembership ? (
                <>
                    {channel ? (
                        <ChannelHeader channel={channel} spaceId={spaceId} />
                    ) : (
                        <ChannelHeaderShimmer />
                    )}
                </>
            ) : showJoinChannel ? (
                <Box absoluteFill centerContent padding="lg">
                    <Button key={channelId.slug} size="button_lg" onClick={onJoinChannel}>
                        <Text truncate>Join #{channel.label}</Text>
                    </Button>
                </Box>
            ) : (
                <MediaDropContextProvider
                    key={channelId.slug}
                    title={imageUploadTitle}
                    id="channel"
                    disableDrop={!isChannelWritable}
                >
                    <MessageTimelineWrapper
                        key={channelId.slug}
                        spaceId={spaceId}
                        channelId={channelId}
                        events={channelMessages}
                        isChannelWritable={isChannelWritable}
                    >
                        <ChannelHeader
                            channel={channel}
                            spaceId={spaceId}
                            onTouchClose={props.onTouchClose}
                        />

                        <MessageTimeline
                            align="bottom"
                            containerRef={timelineContainerRef}
                            header={
                                <ChannelIntro name={channel.label} roomIdentifier={channel.id} />
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
                            highlightId={messageId || highlightId}
                        />
                    </MessageTimelineWrapper>
                    <BoxDebugger />
                    <Box
                        gap
                        paddingBottom={isTouch ? 'none' : 'lg'}
                        paddingX={isTouch ? 'none' : 'lg'}
                    >
                        {!showDMAcceptInvitation && (
                            <RichTextEditor
                                isFullWidthOnTouch
                                editable={!!isChannelWritable}
                                background={isChannelWritable ? 'level2' : 'level1'}
                                displayButtons={isTouch ? 'on-focus' : 'always'}
                                key={channelId.networkId}
                                storageId={channel.id.networkId}
                                autoFocus={!hasThreadOpen && !isTouch}
                                initialValue=""
                                placeholder={placeholder}
                                channels={channels}
                                users={users}
                                userId={userId}
                                onSend={onSend}
                            />
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
        </CentralPanelLayout>
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
