import React, { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { Outlet, useLocation, useParams } from 'react-router'
import {
    ChannelContextProvider,
    Membership,
    SendMessageOptions,
    TimelineEvent,
    ZTEvent,
    useChannelData,
    useChannelTimeline,
    useMyMembership,
    useMyProfile,
    useSpaceMembers,
    useZionClient,
} from 'use-zion-client'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'
import { ChannelIntro } from '@components/ChannelIntro'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { TimelineShimmer } from '@components/Shimmer'
import { DecryptingCard } from '@components/Shimmer/DecryptingCard'
import { ChannelHeaderShimmer } from '@components/Shimmer/TimelineShimmer'
import { Box, Button, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useAuth } from 'hooks/useAuth'
import { RegisterChannelShortcuts } from '@components/Shortcuts/RegisterChannelShortcuts'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { FullScreenMedia } from '@components/FullScreenMedia/FullScreenMedia'
import { QUERY_PARAMS } from 'routes'
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
    const { joinRoom, scrollback, sendMessage } = useZionClient()

    const { spaceId, channelId, channel } = useChannelData()

    const isChannelEncrypted = channel !== undefined
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

    const hasThreadOpen = !!messageId

    const eventHash = window.location.hash?.replace(/^#/, '')
    const highlightId = eventHash?.match(/^\$[a-z0-9_-]{16,128}/i) ? eventHash : undefined

    const { displayDecryptionProgress, decryptionProgress } =
        useDisplayEncryptionProgress(channelMessages)

    const { members } = useSpaceMembers()

    const { loggedInWalletAddress } = useAuth()
    const userId = useMyProfile()?.userId

    const channels = useSpaceChannels()

    const { isChannelWritable } = useIsChannelWritable(spaceId, channelId, loggedInWalletAddress)

    const placeholder = isChannelWritable
        ? `Send a message to #${channel?.label}`
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
            onLoadMore()
        },
        [onLoadMore],
    )

    useEffect(() => {
        // load more when opening the channel
        onLoadMore()
    }, [onLoadMore])
    const [debounceShimmer, setDebounceShimmer] = useState(true)

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebounceShimmer(false)
        }, 50)
        return () => {
            clearTimeout(timeout)
        }
    }, [])

    // https://linear.app/hnt-labs/issue/HNT-1594/app-hanging-and-not-loading-on-desktop
    useEffect(() => {
        console.log('<SpacesChannel /> debug: ', {
            channel,
            channelId,
            displayDecryptionProgress,
            myMembership,
        })
    }, [channel, channelId, displayDecryptionProgress, myMembership])

    return (
        <CentralPanelLayout>
            {!isTouch && <RegisterChannelShortcuts />}
            {!channel || !channelId || displayDecryptionProgress || !myMembership ? (
                <>
                    {channel ? (
                        <ChannelHeader channel={channel} spaceId={spaceId} />
                    ) : (
                        <ChannelHeaderShimmer />
                    )}
                    {debounceShimmer ? (
                        <Box grow width="100%" />
                    ) : (
                        <TimelineShimmer>
                            {displayDecryptionProgress && (
                                <Stack absoluteFill centerContent>
                                    <DecryptingCard progress={decryptionProgress} />
                                </Stack>
                            )}
                        </TimelineShimmer>
                    )}
                </>
            ) : myMembership !== Membership.Join ? (
                <Box absoluteFill centerContent>
                    <Button key={channelId.slug} size="button_lg" onClick={onJoinChannel}>
                        Join #{channel.label}
                    </Button>
                </Box>
            ) : (
                <MediaDropContextProvider title={imageUploadTitle} id="channel">
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
                                <>
                                    <ChannelIntro
                                        name={channel.label}
                                        channelEncrypted={isChannelEncrypted}
                                    />
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
                    <Box
                        gap
                        paddingBottom={isTouch ? 'none' : 'lg'}
                        paddingX={isTouch ? 'none' : 'lg'}
                    >
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
                            members={members}
                            userId={userId}
                            onSend={onSend}
                        />
                    </Box>
                </MediaDropContextProvider>
            )}

            {galleryId && (
                <FullScreenMedia events={channelMessages} threadId={galleryThreadId ?? undefined} />
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

const encryptedMessageTypes = [ZTEvent.RoomMessageEncrypted, ZTEvent.RoomMessage]
const useDisplayEncryptionProgress = (channelMessages: TimelineEvent[]) => {
    const encryptedMessageStats = useMemo(
        () =>
            channelMessages.length > 0 &&
            channelMessages.reduce(
                (k, e) => {
                    if (e.content?.kind && encryptedMessageTypes.includes(e.content?.kind)) {
                        k.total++
                        if (e.content?.kind === ZTEvent.RoomMessageEncrypted) {
                            k.yetEncrypted++
                        } else {
                            k.readable++
                        }
                    }
                    k.progress = 1 - k.yetEncrypted / k.total
                    return k
                },
                { yetEncrypted: 0, total: 0, progress: 0, readable: 0 },
            ),
        [channelMessages],
    )

    // when the component is initially rendered, we only want to display the
    // decryption overlay if it's decrypting all the messages from the scratch.
    // Most of the times enterning a channel, first section of messages is
    // already decrypted
    const isInitiallyReadable =
        encryptedMessageStats &&
        (encryptedMessageStats.readable > 0 || encryptedMessageStats.total === 0)

    const isDecrypting = encryptedMessageStats && encryptedMessageStats.yetEncrypted > 0

    const [displayDecryptionProgress, setDisplayDecryptionProgress] = React.useState(
        !isInitiallyReadable,
    )

    const hasDisplayedOnceRef = useRef(isInitiallyReadable)

    useEffect(() => {
        // display decryption progress once
        if (isDecrypting) {
            if (!hasDisplayedOnceRef.current) {
                hasDisplayedOnceRef.current = true
                setDisplayDecryptionProgress(true)
            }
        } else {
            setDisplayDecryptionProgress(false)
        }
    }, [isDecrypting])

    useEffect(() => {
        // reset timeout on decryption progress
        encryptedMessageStats && encryptedMessageStats.yetEncrypted
        if (displayDecryptionProgress) {
            // no progress after 3s, hide the popup for good
            const timeout = setTimeout(() => {
                setDisplayDecryptionProgress(false)
            }, 1000 * 3)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [displayDecryptionProgress, encryptedMessageStats])

    return {
        displayDecryptionProgress,
        decryptionProgress: (encryptedMessageStats && encryptedMessageStats?.progress) || 0,
    }
}
