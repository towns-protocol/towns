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
            borderBottom
            gap
            paddingX="lg"
            background="level1"
            height="x8"
            alignItems="center"
            color="gray1"
            overflow="hidden"
            shrink={false}
        >
            <Link to="info?channel">
                <Stack
                    horizontal
                    border
                    paddingX
                    gap="sm"
                    paddingY="sm"
                    background="level2"
                    alignItems="center"
                    rounded="sm"
                >
                    <Icon type="tag" size="square_sm" color="gray2" />
                    <Paragraph fontWeight="strong" color="default">
                        {channel.label}
                    </Paragraph>
                </Stack>
            </Link>
            {topic && <Paragraph color="gray2">{topic}</Paragraph>}
            <Stack grow />
            <ChannelUsersPill channelId={channel.id} spaceId={spaceId} />
        </Stack>
    )
}
