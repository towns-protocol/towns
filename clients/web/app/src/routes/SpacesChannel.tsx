import React, { useCallback, useEffect, useRef } from 'react'
import { Outlet, useParams } from 'react-router'
import {
    ChannelContextProvider,
    Membership,
    SendMessageOptions,
    TimelineEvent,
    ZTEvent,
    useChannelData,
    useChannelTimeline,
    useMyMembership,
    useZionClient,
} from 'use-zion-client'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'
import { ChannelIntro } from '@components/ChannelIntro'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { TimelineShimmer } from '@components/Shimmer'
import { DecryptingCard } from '@components/Shimmer/DecryptingCard'
import { Box, Button, Stack } from '@ui'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const SpacesChannel = () => {
    return (
        <SpaceChannelWrapper>
            <SpacesChannelComponent />
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

const SpacesChannelComponent = () => {
    const { messageId } = useParams()

    const { joinRoom, sendMessage, isRoomEncrypted } = useZionClient()

    const { spaceId, channelId, channel } = useChannelData()

    const isChannelEncrypted = channel && isRoomEncrypted(channel.id)

    const myMembership = useMyMembership(channelId)
    const { timeline: channelMessages } = useChannelTimeline()

    const onSend = useCallback(
        (value: string, options: SendMessageOptions | undefined) => {
            if (value && channelId) {
                sendMessage(channelId, value, options)
            }
        },
        [channelId, sendMessage],
    )

    const onJoinChannel = useCallback(() => {
        joinRoom(channelId)
    }, [joinRoom, channelId])

    const hasThreadOpen = !!messageId

    const eventHash = window.location.hash?.replace(/^#/, '')
    const highlightId = eventHash?.match(/^\$[a-z0-9_-]{16,128}/i) ? eventHash : undefined

    const { displayDecryptionPopup, decryptionProgress } =
        useDisplayEncryptionProgress(channelMessages)

    return (
        <CentralPanelLayout>
            {!channel || !channelId || displayDecryptionPopup ? (
                <TimelineShimmer>
                    {displayDecryptionPopup && (
                        <Stack absoluteFill centerContent>
                            <DecryptingCard progress={decryptionProgress} />
                        </Stack>
                    )}
                </TimelineShimmer>
            ) : myMembership !== Membership.Join ? (
                <Box absoluteFill centerContent>
                    <Button key={channelId.slug} size="button_lg" onClick={onJoinChannel}>
                        Join #{channel.label}
                    </Button>
                </Box>
            ) : (
                <Box grow absoluteFill height="100%" justifyContent="end">
                    <ChannelHeader channel={channel} spaceId={spaceId} />

                    {/* 
                        /!\ keep
                        spacer allowing the header to always stick to the top 
                        in case the timeline is smaller than the screen
                    */}
                    <Stack grow />

                    <MessageTimelineWrapper
                        key={channelId.slug}
                        spaceId={spaceId}
                        channelId={channelId}
                        events={channelMessages}
                    >
                        <MessageTimeline
                            header={
                                <ChannelIntro
                                    name={channel.label}
                                    channelEncrypted={isChannelEncrypted}
                                />
                            }
                            highlightId={messageId || highlightId}
                        />
                    </MessageTimelineWrapper>

                    <Box gap paddingBottom="lg" paddingX="lg">
                        <RichTextEditor
                            editable
                            background="level3"
                            key={channelId.networkId}
                            storageId={channel.id.networkId}
                            autoFocus={!hasThreadOpen}
                            initialValue=""
                            placeholder={`Send a message to #${channel?.label}`}
                            onSend={onSend}
                        />
                    </Box>
                </Box>
            )}
        </CentralPanelLayout>
    )
}

const useDisplayEncryptionProgress = (channelMessages: TimelineEvent[]) => {
    const [displayDecryptionPopup, setDisplayEncrypted] = React.useState(false)
    const messageTypes = [ZTEvent.RoomMessageEncrypted, ZTEvent.RoomMessage]
    const encryptedMessageStats =
        channelMessages.length > 0 &&
        channelMessages.reduce(
            (k, e) => {
                if (e.content?.kind && messageTypes.includes(e.content?.kind)) {
                    k.total++
                    if (e.content?.kind === ZTEvent.RoomMessageEncrypted) {
                        k.encrypted++
                    }
                }
                k.progress = 1 - k.encrypted / k.total
                return k
            },
            { encrypted: 0, total: 0, progress: 0 },
        )

    const hasEncrypted = encryptedMessageStats && encryptedMessageStats.encrypted > 0
    const hasDisplayedOnce = useRef(
        // dismiss popup if channel is prepopulated with unencrypted messages
        encryptedMessageStats ? encryptedMessageStats.encrypted === 0 : false,
    )

    useEffect(() => {
        if (hasDisplayedOnce.current) {
            // when popup is showing...
            if (!hasEncrypted) {
                // remove popup when no encrypted message is left
                setDisplayEncrypted(false)
            }
        } else {
            // when popup is not showing...
            if (hasEncrypted) {
                // display
                setDisplayEncrypted(true)
                hasDisplayedOnce.current = true
                const timeout = setTimeout(() => {
                    // remove on timeout
                    setDisplayEncrypted(false)
                }, 1000 * 15)

                return () => {
                    clearTimeout(timeout)
                }
            }
        }
    }, [hasEncrypted])

    console.log(encryptedMessageStats)

    return {
        displayDecryptionPopup,
        decryptionProgress: (encryptedMessageStats && encryptedMessageStats?.progress) || 0,
    }
}
