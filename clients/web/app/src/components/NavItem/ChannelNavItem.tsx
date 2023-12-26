import React, { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { Channel, SpaceData, useChannelNotificationCounts } from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { PATHS } from 'routes'
import { Badge, ButtonText, Icon, Stack } from '@ui'
import { ChannelSettingsModal } from '@components/ChannelSettings/ChannelSettingsModal'
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
    const [showChannelSettings, setShowChannelSettings] = useState<boolean>(false)

    const { id, space, channel, mentionCount = 0 } = props
    const notis = useChannelNotificationCounts(channel.id)

    const link = `/${PATHS.SPACES}/${space.id}/channels/${channel.id}/`
    const isHighlight = channel.id === channelSlug

    const onHideChannelSettingsPopup = useEvent(() => {
        setShowChannelSettings(false)
    })

    const onUpdatedChannel = useCallback(() => {
        // placeholder for UI/state changes after channel is updated
        // successfully
        onHideChannelSettingsPopup()
    }, [onHideChannelSettingsPopup])

    const { channelIsMuted, spaceIsMuted } = useMuteSettings({
        spaceId: space.id,
        channelId: channel.id,
    })
    const isMuted = channelIsMuted || spaceIsMuted
    const showUnread = notis.isUnread && !isMuted

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
