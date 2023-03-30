import React, { useCallback, useEffect, useMemo, useRef } from 'react'
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
import { Box, Button, Stack } from '@ui'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
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

    const { displayDecryptionProgress: displayDecryptionPopup, decryptionProgress } =
        useDisplayEncryptionProgress(channelMessages)

    const { members } = useSpaceMembers()
    const channels = useSpaceChannels()

    const { isChannelWritable } = useIsChannelWritable(channelId)

    const placeholder = isChannelWritable
        ? `Send a message to #${channel?.label}`
        : isChannelWritable === false
        ? `You don't have permission to send messages to this channel`
        : `Loading permissions`

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
                        isChannelWritable={isChannelWritable}
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
                            editable={!!isChannelWritable}
                            background={isChannelWritable ? 'level3' : 'level2'}
                            key={channelId.networkId}
                            storageId={channel.id.networkId}
                            autoFocus={!hasThreadOpen}
                            initialValue=""
                            placeholder={placeholder}
                            channels={channels}
                            members={members}
                            onSend={onSend}
                        />
                    </Box>
                </Box>
            )}
        </CentralPanelLayout>
    )
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
                        }
                    }
                    k.progress = 1 - k.yetEncrypted / k.total
                    return k
                },
                { yetEncrypted: 0, total: 0, progress: 0 },
            ),
        [channelMessages],
    )

    const isDecrypting = encryptedMessageStats && encryptedMessageStats.yetEncrypted > 0
    const [displayDecryptionProgress, setDisplayDecryptionProgress] = React.useState(isDecrypting)

    const hasDisplayedOnceRef = useRef(false)

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
