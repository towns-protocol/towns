import React from 'react'
import { Channel } from 'use-towns-client'
import { Box, Heading, Icon, Paragraph } from '@ui'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'

export const ChannelDisabledComponent = (props: { channel: Channel }) => {
    const { channel } = props
    return (
        <>
            <ChannelHeader channel={channel} spaceId={undefined} />
            <Box grow centerContent padding="lg">
                <Box centerContent gap="md">
                    <Box padding="md" color="gray2" background="level2" rounded="sm">
                        <Icon type="tag" size="square_sm" />
                    </Box>
                    <Heading level={3}>#{channel.label} is disabled</Heading>
                    <Paragraph color="gray2">This channel is disabled</Paragraph>
                </Box>
            </Box>
        </>
    )
}
