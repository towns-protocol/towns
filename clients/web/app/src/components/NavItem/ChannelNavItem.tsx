import React from 'react'
import { useParams } from 'react-router'
import { Channel, SpaceData, useTownsContext } from 'use-towns-client'
import { PATHS } from 'routes'
import { Badge, ButtonText, Icon, Stack } from '@ui'
import { useMuteSettings } from 'api/lib/notificationSettings'
import { NavItem } from './_NavItem'

type Props = {
    id: string
    space: SpaceData
    channel: Channel
    mentionCount?: number
}

export const ChannelNavItem = (props: Props) => {
    const { channelSlug } = useParams()

    const { id, space, channel, mentionCount = 0 } = props

    const link = `/${PATHS.SPACES}/${space.id}/channels/${channel.id}/`
    const isHighlight = channel.id === channelSlug

    const { channelIsMuted, spaceIsMuted } = useMuteSettings({
        spaceId: space.id,
        channelId: channel.id,
    })

    const isMuted = channelIsMuted || spaceIsMuted

    const { spaceUnreadChannelIds } = useTownsContext()
    const showUnread = spaceUnreadChannelIds[space.id]?.has(channel.id)

    return (
        <>
            <NavItem to={link} id={id} exact={false} paddingY="xxs" minHeight="x5">
                <Icon
                    type="tag"
                    padding="line"
                    background="level2"
                    color={showUnread ? 'default' : 'gray2'}
                    size="square_lg"
                />
                <ButtonText
                    strong={showUnread}
                    color={showUnread ? 'default' : isHighlight ? 'default' : undefined}
                >
                    {channel.label}
                </ButtonText>
                <Stack horizontal grow gap justifyContent="end">
                    {isMuted && <Icon size="square_xs" type="muteActive" color="gray2" />}
                    {!!mentionCount && <Badge value={mentionCount}>{mentionCount}</Badge>}
                </Stack>
            </NavItem>
        </>
    )
}
