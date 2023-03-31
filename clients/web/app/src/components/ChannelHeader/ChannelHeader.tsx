import React from 'react'
import { Channel, RoomIdentifier, useRoom } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { ChannelUsersPill } from '@components/ChannelUserPill/ChannelUserPill'
import { Icon, Paragraph, Stack } from '@ui'

type Props = {
    channel: Channel
    spaceId: RoomIdentifier
}

export const ChannelHeader = (props: Props) => {
    const { channel, spaceId } = props

    const topic = useRoom(channel?.id)?.topic

    return (
        <Stack
            horizontal
            gap
            borderBottom
            paddingX="lg"
            background="level1"
            height="x8"
            alignItems="center"
            color="gray1"
            overflow="hidden"
            shrink={false}
        >
            <Icon type="tag" background="level2" size="square_lg" />
            <Stack horizontal gap alignItems="end">
                <Paragraph strong size="lg">
                    <Link to="info?channel">{channel.label}</Link>
                </Paragraph>
                {topic && <Paragraph color="gray2">{topic}</Paragraph>}
            </Stack>
            <Stack grow />
            <ChannelUsersPill channelId={channel.id} spaceId={spaceId} />
        </Stack>
    )
}
