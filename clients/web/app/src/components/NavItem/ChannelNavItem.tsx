import React from 'react'
import { useParams } from 'react-router'
import { Channel, SpaceData, useTownsContext } from 'use-towns-client'
import { PATHS } from 'routes'
import { Badge, Box, ButtonText, Icon, Stack } from '@ui'
import { useMuteSettings } from 'api/lib/notificationSettings'
import { FavoriteChannelButton } from '@components/FavoriteChannelButton/FavoriteChannelButton'
import { NavItem } from './_NavItem'

type Props = {
    id: string
    space: SpaceData
    channel: Channel
    favorite?: boolean
    mentionCount?: number
    isUnreadSection?: boolean
}

export const ChannelNavItem = (props: Props) => {
    const { channelSlug } = useParams()

    const {
        id,
        space,
        channel,
        mentionCount = 0,
        favorite = false,
        isUnreadSection = false,
    } = props

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
                <Stack horizontal width="100%" gap="sm" alignItems="center">
                    <Box>
                        <Icon
                            type="tag"
                            padding="line"
                            background="level2"
                            color={showUnread ? 'default' : 'gray2'}
                            size="square_lg"
                            shrink={false}
                        />
                    </Box>
                    <ButtonText
                        strong={showUnread}
                        color={showUnread ? 'default' : isHighlight ? 'default' : undefined}
                    >
                        {channel.label}
                    </ButtonText>
                    <Box grow />
                    <FavoriteChannelButton
                        isUnreadSection={isUnreadSection}
                        channelId={channel.id}
                        favorite={favorite}
                    />

                    <Box>
                        {isMuted && <Icon size="square_xs" type="muteActive" color="gray2" />}
                        {!!mentionCount && <Badge value={mentionCount}>{mentionCount}</Badge>}
                    </Box>
                </Stack>
            </NavItem>
        </>
    )
}
