import React, { useCallback } from 'react'
import { useTownsClient } from 'use-towns-client'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'
import { Box, Button, Heading, Icon, Paragraph } from '@ui'

export const UnjoinedChannelComponent = (props: {
    hideHeader?: boolean
    spaceId?: string
    channel: { id: string; label: string; topic?: string }
}) => {
    const { channel } = props
    const channelId = channel.id
    const { hideHeader, spaceId } = props
    const { joinRoom } = useTownsClient()

    const onJoinChannel = useCallback(() => {
        if (channelId) {
            joinRoom(channelId)
        }
    }, [joinRoom, channelId])

    return (
        <>
            {!hideHeader && <ChannelHeader channel={channel} spaceId={spaceId} />}
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
                        hoverEffect="none"
                        minWidth="100"
                        rounded="sm"
                        size="button_sm"
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
