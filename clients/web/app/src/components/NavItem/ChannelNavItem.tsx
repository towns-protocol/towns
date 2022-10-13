import React from 'react'
import { useParams } from 'react-router'
import { Channel, SpaceData, useZionContext } from 'use-zion-client'
import { ButtonText, Icon, TooltipRenderer } from '@ui'
import { ChannelSettingsCard } from '@components/Cards/ChannelSettingsCard'
import { NavItem } from './_NavItem'

type Props = {
    id: string
    space: SpaceData
    channel: Channel
}

export const ChannelNavItem = (props: Props) => {
    const { channelSlug } = useParams()
    const { unreadCounts } = useZionContext()

    const { id, space, channel } = props
    const unreadCount = unreadCounts[channel.id.matrixRoomId]

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
                const isUnread = unreadCount > 0

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
                            strong={isHighlight || isUnread}
                            color={isHighlight ? 'default' : isUnread ? 'gray1' : undefined}
                        >
                            {channelName}
                        </ButtonText>
                        {/* {!!mentionCount && (
              <Box
                centerContent
                shrink={false}
                background="level3"
                rounded="full"
                square="square_sm"
                fontSize="sm"
                fontWeight="strong"
                color="default"
              >
                {mentionCount}
              </Box>
            )} */}
                    </NavItem>
                )
            }}
        </TooltipRenderer>
    )
}
