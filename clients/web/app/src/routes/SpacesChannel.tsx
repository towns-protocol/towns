import { Allotment } from 'allotment'
import React, { useCallback, useEffect, useState } from 'react'
import { Outlet, useOutlet, useParams } from 'react-router'
import {
    ChannelContextProvider,
    Membership,
    RoomIdentifier,
    useChannelData,
    useChannelTimeline,
    useMyMembership,
    useZionClient,
} from 'use-zion-client'
import { ChannelHeader } from '@components/ChannelHeader'
import { MessageTimelineScroller } from '@components/MessageTimeline'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Button, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { TimelineShimmer } from '@components/Shimmer'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { contentWithUrlsAttached } from '@components/RichText/utils/textParsers'
import { MessageTimelineVirtual } from '@components/MessageTimeline/MessageTimelineVirtual'

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
const USE_VLIST = true
const SpacesChannelComponent = () => {
    const { messageId } = useParams()
    const { sizes, onSizesChange } = usePersistPanes(['channel', 'right'])
    const outlet = useOutlet()

    const { joinRoom, sendMessage } = useZionClient()

    const { spaceId, channelId, channel } = useChannelData()

    const myMembership = useMyMembership(channelId)
    const channelMessages = useChannelTimeline()

    const onSend = useCallback(
        (value: string) => {
            if (value && channelId) {
                sendMessage(channelId, value)
            }
        },
        [channelId, sendMessage],
    )

    const onJoinChannel = useCallback(() => {
        joinRoom(channelId)
    }, [joinRoom, channelId])

    const hasThreadOpen = !!messageId

    // FIXME: timeline content is set one frame after the channelId is updated
    // resulting in the odd state. this needs to be fixed in side of lib separately
    const [deferredChannelId, setDeferredChannelId] = useState<RoomIdentifier>()
    useEffect(() => {
        setDeferredChannelId(channel?.id)
    }, [channel?.id])

    return (
        <Stack horizontal minHeight="100%">
            <Allotment onChange={onSizesChange}>
                <Allotment.Pane minSize={550}>
                    {!channel || !deferredChannelId ? (
                        <TimelineShimmer />
                    ) : myMembership !== Membership.Join ? (
                        <Box absoluteFill centerContent>
                            <Button key={channelId.slug} size="button_lg" onClick={onJoinChannel}>
                                Join #{channel.label}
                            </Button>
                        </Box>
                    ) : (
                        <Box grow absoluteFill height="100%" justifyContent="end">
                            <MessageTimelineWrapper
                                key={channelId.slug}
                                spaceId={spaceId}
                                channelId={channelId}
                                events={channelMessages}
                            >
                                {!USE_VLIST ? (
                                    <MessageTimelineScroller
                                        hideThreads
                                        before={<ChannelHeader name={channel.label} />}
                                    />
                                ) : (
                                    <MessageTimelineVirtual />
                                )}
                            </MessageTimelineWrapper>

                            <Box gap paddingBottom="lg" paddingX="lg">
                                <RichTextEditor
                                    editable
                                    autoFocus={!hasThreadOpen}
                                    initialValue=""
                                    placeholder={`Send a message to #${channel?.label}`}
                                    onSend={onSend}
                                />
                            </Box>
                        </Box>
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
