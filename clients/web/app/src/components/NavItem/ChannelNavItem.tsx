import React from 'react'
import { useParams } from 'react-router'
import { Channel, SpaceData, useChannelNotificationCounts } from 'use-zion-client'
import { Badge, ButtonText, Icon, Stack, TooltipRenderer } from '@ui'
import { ChannelSettingsCard } from '@components/Cards/ChannelSettingsCard'
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
    const notis = useChannelNotificationCounts(channel.id)

    const link = `/spaces/${space.id.slug}/channels/${channel.id.slug}/`
    const isHighlight = channel.id.slug === channelSlug

    return (
        <TooltipRenderer
            trigger="contextmenu"
            placement="pointer"
            render={
                <ChannelSettingsCard
                    spaceId={space.id}
                    channelId={channel.id}
                    channelName={channel.label}
                />
            }
            layoutId={id}
        >
            {({ triggerProps }) => {
                const channelName = channel.label.toLocaleLowerCase()

                return (
                    <NavItem to={link} id={id} {...triggerProps} exact={false}>
                        <Icon
                            type="tag"
                            padding="line"
                            background="level2"
                            color="gray2"
                            size="square_lg"
                        />
                        <ButtonText
                            strong={notis.isUnread}
                            color={notis.isUnread ? 'default' : isHighlight ? 'default' : undefined}
                        >
                            {channelName}
                        </ButtonText>
                        {!!mentionCount && (
                            <Stack horizontal grow justifyContent="end">
                                <Badge value={mentionCount}>{mentionCount}</Badge>
                            </Stack>
                        )}
                    </NavItem>
                )
            }}
        </TooltipRenderer>
    )
}
