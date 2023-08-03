import React from 'react'
import { Channel, RoomIdentifier, useRoom } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { ChannelUsersPill } from '@components/ChannelUserPill/ChannelUserPill'
import { Box, Button, Icon, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { TouchLayoutNavigationBar } from '@components/TouchLayoutNavigationBar/TouchLayoutNavigationBar'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { useMuteSettings } from 'api/lib/notificationSettings'

type Props = {
    channel: Channel
    spaceId: RoomIdentifier
}

export const ChannelHeader = (props: Props) => {
    const { isTouch } = useDevice()
    return isTouch ? (
        <TouchLayoutNavigationBar value={props.channel} />
    ) : (
        <DesktopChannelHeader {...props} />
    )
}

const DesktopChannelHeader = (props: Props) => {
    const { channel, spaceId } = props
    const { displayNotificationBanner, requestPushPermission, denyPushPermission } =
        usePushNotifications()
    const topic = useRoom(channel.id)?.topic

    const { channelIsMuted, spaceIsMuted } = useMuteSettings({
        spaceId: spaceId.networkId,
        channelId: channel.id.networkId,
    })
    const isMuted = channelIsMuted || spaceIsMuted

    return (
        <Stack gap>
            {displayNotificationBanner && (
                <Stack
                    horizontal
                    gap
                    paddingY
                    paddingX="lg"
                    background="level3"
                    alignItems="center"
                >
                    <Text fontWeight="strong" color="default">
                        Turn on notification badges for threads and mentions?
                    </Text>
                    <Box grow />
                    <Button tone="cta1" onClick={requestPushPermission}>
                        Enable
                    </Button>
                    <Button tone="level2" onClick={denyPushPermission}>
                        No thanks
                    </Button>
                </Stack>
            )}
            <Stack
                horizontal
                borderBottom
                gap
                paddingX="lg"
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
                        hoverable
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
                        {isMuted && <Icon type="muteActive" size="square_sm" color="gray2" />}
                    </Stack>
                </Link>
                {topic && <Paragraph color="gray2">{topic}</Paragraph>}
                <Stack grow />
                <ChannelUsersPill channelId={channel.id} spaceId={spaceId} />
            </Stack>
        </Stack>
    )
}
