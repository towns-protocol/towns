import React from 'react'
import { Channel } from 'use-towns-client'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'
import { Box, Button, Heading, Icon, Paragraph } from '@ui'

export const UnjoinedChannelComponent = ({
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
