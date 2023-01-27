import React from 'react'
import { Channel, RoomIdentifier } from 'use-zion-client'
import { ChannelUsersPill } from '@components/ChannelUserPill/ChannelUserPill'
import { Icon, Paragraph, Stack } from '@ui'

type Props = {
    channel: Channel
    spaceId: RoomIdentifier
}

export const ChannelHeader = (props: Props) => {
    const { channel, spaceId } = props

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
            <Icon type="unlock" background="level2" size="square_lg" />
            <Stack horizontal gap alignItems="end">
                <Paragraph strong size="lg">
                    {channel.label}
                </Paragraph>
                <Paragraph color="gray2">{/* {`Main space for Zioneers`} */}</Paragraph>
            </Stack>
            <Stack grow />
            <ChannelUsersPill channelId={channel.id} spaceId={spaceId} />
        </Stack>
    )
}
