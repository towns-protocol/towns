import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Channel, SpaceData, useChannelNotificationCounts, useRoom } from 'use-zion-client'
import useEvent from 'react-use-event-hook'
import { Badge, ButtonText, Icon, Stack, TooltipRenderer } from '@ui'
import { ChannelSettingsCard } from '@components/Cards/ChannelSettingsCard'
import { ChannelSettingsModal } from '@components/ChannelSettings/ChannelSettingsModal'
import { PATHS } from 'routes'
import { NavItem } from './_NavItem'

type Props = {
    id: string
    space: SpaceData
    channel: Channel
    mentionCount?: number
}

export const ChannelNavItem = (props: Props) => {
    const { channelSlug } = useParams()
    const [showChannelSettings, setShowChannelSettings] = useState<boolean>(false)

    const { id, space, channel, mentionCount = 0 } = props
    const notis = useChannelNotificationCounts(channel.id)
    const room = useRoom(channel?.id)

    const link = `/spaces/${space.id.slug}/channels/${channel.id.slug}/`
    const isHighlight = channel.id.slug === channelSlug

    const channelName = useMemo(() => {
        return room?.name.toLocaleLowerCase()
    }, [room?.name])

    const onShowChannelSettingsPopup = useEvent(() => {
        setShowChannelSettings(true)
    })

    const onHideChannelSettingsPopup = useEvent(() => {
        setShowChannelSettings(false)
    })

    const onUpdatedChannel = useCallback(() => {
        // placeholder for UI/state changes after channel is updated
        // successfully
        onHideChannelSettingsPopup()
    }, [onHideChannelSettingsPopup])

    return (
        <>
            {showChannelSettings && (
                <ChannelSettingsModal
                    spaceId={space.id}
                    channelId={channel.id}
                    onHide={onHideChannelSettingsPopup}
                    onUpdatedChannel={onUpdatedChannel}
                />
            )}
            <TooltipRenderer
                trigger="contextmenu"
                placement="pointer"
                render={
                    <ChannelSettingsCard
                        spaceId={space.id}
                        channelId={channel.id}
                        channelName={channel.label}
                        onShowChannelSettingsPopup={onShowChannelSettingsPopup}
                    />
                }
                layoutId={id}
            >
                {({ triggerProps }) => {
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
                                color={
                                    notis.isUnread ? 'default' : isHighlight ? 'default' : undefined
                                }
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
        </>
    )
}
