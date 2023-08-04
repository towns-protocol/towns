import React, { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { Channel, SpaceData, useChannelNotificationCounts } from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { PATHS } from 'routes'
import { Badge, ButtonText, CardOpener, Icon, Stack } from '@ui'
import { ChannelSettingsCard } from '@components/Cards/ChannelSettingsCard'
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

    const link = `/${PATHS.SPACES}/${space.id.slug}/channels/${channel.id.slug}/`
    const isHighlight = channel.id.slug === channelSlug

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

    const { channelIsMuted, spaceIsMuted } = useMuteSettings({
        spaceId: space.id.networkId,
        channelId: channel.id.networkId,
    })
    const isMuted = channelIsMuted || spaceIsMuted

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
            <CardOpener
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
                                background={{ darkMode: 'level2' }}
                                color={{ darkMode: 'gray2', default: 'gray2' }}
                                size="square_lg"
                            />
                            <ButtonText
                                strong={notis.isUnread}
                                color={
                                    notis.isUnread ? 'default' : isHighlight ? 'default' : undefined
                                }
                            >
                                {channel.label}
                            </ButtonText>
                            <Stack horizontal grow gap justifyContent="end">
                                {isMuted && (
                                    <Icon size="square_xs" type="muteActive" color="gray2" />
                                )}
                                {!!mentionCount && (
                                    <Badge value={mentionCount}>{mentionCount}</Badge>
                                )}
                            </Stack>
                        </NavItem>
                    )
                }}
            </CardOpener>
        </>
    )
}
