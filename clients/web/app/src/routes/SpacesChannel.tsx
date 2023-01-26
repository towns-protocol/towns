import React, { useCallback } from 'react'
import { Outlet, useParams } from 'react-router'
import {
    ChannelContextProvider,
    Membership,
    SendMessageOptions,
    useChannelData,
    useChannelTimeline,
    useMyMembership,
    useZionClient,
} from 'use-zion-client'
import { ChannelHeader } from '@components/ChannelHeader'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { TimelineShimmer } from '@components/Shimmer'
import { Box, Button } from '@ui'
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

    const { joinRoom, sendMessage } = useZionClient()

    const { spaceId, channelId, channel } = useChannelData()

    const myMembership = useMyMembership(channelId)
    const channelMessages = useChannelTimeline()

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

    return (
        <CentralPanelLayout>
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
                        <MessageTimeline
                            header={<ChannelHeader name={channel.label} />}
                            highlightId={messageId || highlightId}
                        />
                    </MessageTimelineWrapper>

                    <Box gap paddingBottom="lg" paddingX="lg">
                        <RichTextEditor
                            editable
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
