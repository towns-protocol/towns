import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import React, { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { Outlet, useLocation, useParams } from 'react-router'
import {
    ChannelContextProvider,
    Membership,
    MessageType,
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
import { RegisterChannelShortcuts } from '@components/Shortcuts/RegisterChannelShortcuts'
import { useUserList } from '@components/UserList/UserList'
import { Box, Button, Stack, Text } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useDevice } from 'hooks/useDevice'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { QUERY_PARAMS } from 'routes'
import { notUndefined } from 'ui/utils/utils'
import { SECOND_MS } from 'data/constants'
import PlateEditor from '@components/RichTextPlate/PlateEditor'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'
import { env } from '../utils'

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

const SpaceChannelWrapper = (props: { children: React.ReactElement } & { channelId?: string }) => {
    const { channelSlug } = useParams()
    const channelId = props.channelId ?? channelSlug
    if (!channelId) {
        return <>SpacesChannel Route expects a channelSlug</>
    }
    return <ChannelContextProvider channelId={channelId}>{props.children}</ChannelContextProvider>
}

export const SpacesChannelComponent = (props: Props) => {
    const { messageId: threadId } = useParams()
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
            const valid =
                value.length > 0 ||
                (options?.messageType === MessageType.Text && options.attachments?.length)

            if (valid && channelId && spaceId) {
                sendMessage(channelId, value, { parentSpaceId: spaceId, ...options })
            } else if (valid && channelId) {
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

    const hasThreadOpen = !!threadId

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

    const showJoinChannel = myMembership && myMembership !== Membership.Join && !isDmOrGDM
    const showDMAcceptInvitation = myMembership === Membership.Invite && isDmOrGDM

    const MessageEditor =
        env.VITE_ENABLE_SLATE_EDITOR || isTouch || channel?.label.match(/slate$/)
            ? PlateEditor
            : RichTextEditor
    return (
        <CentralPanelLayout>
            {!isTouch && <RegisterChannelShortcuts />}
            {channel && showJoinChannel ? (
                <Box absoluteFill centerContent padding="lg">
                    <Button key={channelId} size="button_lg" onClick={onJoinChannel}>
                        <Text truncate>Join #{channel.label}</Text>
                    </Button>
                </Box>
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
                                onTouchClose={props.onTouchClose}
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
                    <Box
                        gap
                        paddingBottom={isTouch ? 'none' : 'md'}
                        paddingX={isTouch ? 'none' : 'md'}
                    >
                        {!showDMAcceptInvitation && channel && (
                            <MessageEditor
                                isFullWidthOnTouch
                                editable={!!isChannelWritable}
                                background={isChannelWritable ? 'level2' : 'level1'}
                                displayButtons={isTouch ? 'on-focus' : 'always'}
                                key={`${channelId}-${isChannelWritable ? '' : '-readonly'}`}
                                storageId={channel.id}
                                autoFocus={!hasThreadOpen && !isTouch && !props.preventAutoFocus}
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
