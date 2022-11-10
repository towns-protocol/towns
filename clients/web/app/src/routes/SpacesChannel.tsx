import { Allotment } from 'allotment'
import React, { useCallback } from 'react'
import { Outlet, useOutlet, useParams } from 'react-router'
import {
    ChannelContextProvider,
    Membership,
    useChannelData,
    useChannelTimeline,
    useMyMembership,
    useZionClient,
} from 'use-zion-client'
import { ChannelHeader } from '@components/ChannelHeader'
import { ObsoleteMessageTimelineScroller } from '@components/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { TimelineShimmer } from '@components/Shimmer'
import { Box, Button, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'

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

    return (
        <Stack horizontal minHeight="100%">
            <Allotment onChange={onSizesChange}>
                <Allotment.Pane minSize={550}>
                    {!channel || !channelId ? (
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
                                    <ObsoleteMessageTimelineScroller hideThreads />
                                ) : (
                                    <MessageTimeline
                                        header={<ChannelHeader name={channel.label} />}
                                    />
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
