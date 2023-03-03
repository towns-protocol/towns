import React from 'react'
import { Channel, MessageType, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { Box, Card, Icon, Stack, TooltipRenderer } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { MessageZionText } from '../../MessageZionText/MessageZionText'

type Props = {
    event: TimelineEvent
    eventContent: RoomMessageEvent
    members: RoomMember[]
    channels: Channel[]
}

export const TimelineMessageContent = (props: Props) => {
    const { eventContent, event, members, channels } = props

    switch (eventContent.msgType) {
        case MessageType.Image: {
            return (
                <RatioedBackgroundImage
                    withLinkOut
                    url={eventContent.content.url}
                    width={eventContent.content.info?.thumbnail_info?.w}
                    height={eventContent.content.info?.thumbnail_info?.h}
                />
            )
        }

        default: {
            return (
                <MessageZionText
                    eventContent={eventContent}
                    event={event}
                    members={members}
                    channels={channels}
                />
            )
        }
    }
}

export const TimelineEncryptedContent = (props: {
    event: TimelineEvent
    displayContext: 'tail' | 'body' | 'head' | 'single'
}) => {
    const { event, displayContext } = props
    const width =
        (Math.floor((Math.cos(event.originServerTs / 1000) * 0.5 + 0.5) * 4) / 4) * 250 + 200
    return (
        <Stack horizontal centerContent gap="sm" style={{ width }} insetY="xxs">
            <Box grow height="x2" borderRadius="xs" background="level2" />
            {displayContext === 'tail' ? null : (
                <TooltipRenderer
                    placement="pointer"
                    render={
                        <Card
                            border
                            padding="sm"
                            fontSize="sm"
                            rounded="sm"
                            maxWidth="250"
                            textAlign="center"
                        >
                            This message cannot be decrypted because you don&apos;t have this
                            user&apos;s keys.
                        </Card>
                    }
                >
                    {({ triggerProps }) => (
                        <Icon
                            type="nokey"
                            size="square_sm"
                            style={{ color: vars.color.background.level2 }}
                            {...triggerProps}
                        />
                    )}
                </TooltipRenderer>
            )}
        </Stack>
    )
}
