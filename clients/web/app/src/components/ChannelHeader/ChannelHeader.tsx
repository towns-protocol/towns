import React, { useCallback } from 'react'
import { Channel, RoomIdentifier, useChannelMembers, useRoom } from 'use-zion-client'
import { Link, useNavigate } from 'react-router-dom'
import { ChannelUsersPill } from '@components/ChannelUserPill/ChannelUserPill'
import { Box, Button, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { useMuteSettings } from 'api/lib/notificationSettings'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'

type Props = {
    channel: Channel
    spaceId: RoomIdentifier
    onTouchClose?: () => void
}

export const ChannelHeader = (props: Props) => {
    const { isTouch } = useDevice()
    return isTouch ? <TouchChannelHeader {...props} /> : <DesktopChannelHeader {...props} />
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

const TouchChannelHeader = (props: Props) => {
    const { channel, onTouchClose } = props
    const navigate = useNavigate()
    const spaceId = useSpaceIdFromPathname()
    const { members } = useChannelMembers()
    const { displayNotificationBanner, requestPushPermission, denyPushPermission } =
        usePushNotifications()
    const { channelIsMuted, spaceIsMuted } = useMuteSettings({
        spaceId: spaceId,
        channelId: channel?.id.networkId,
    })

    const isMuted = channelIsMuted || spaceIsMuted

    const infoButtonPressed = useCallback(() => {
        navigate(`info?channel`)
    }, [navigate])

    return (
        <Stack gap="sm">
            <TouchNavBar
                contentLeft={
                    <IconButton
                        icon="back"
                        size="square_md"
                        color="default"
                        onClick={onTouchClose}
                    />
                }
                contentRight={
                    <IconButton
                        icon="info"
                        size="square_sm"
                        color="default"
                        onClick={infoButtonPressed}
                    />
                }
            >
                <Stack gap="sm" onClick={infoButtonPressed}>
                    <Stack horizontal gap="sm" alignContent="center">
                        <Paragraph strong color="default">
                            #{channel.label}
                        </Paragraph>
                        {isMuted && <Icon type="muteActive" size="square_xxs" color="gray2" />}
                    </Stack>

                    <Paragraph truncate color="gray2" size="sm">
                        {`${members.length} member${members.length > 1 ? `s` : ``}`}
                        {channel.topic ? ` · ${channel.topic.toLocaleLowerCase()}` : ``}
                    </Paragraph>
                </Stack>
            </TouchNavBar>
            {displayNotificationBanner && (
                <Box paddingX="md">
                    <Stack
                        gap
                        paddingY
                        border
                        paddingX="md"
                        background="level2"
                        alignItems="start"
                        rounded="sm"
                    >
                        <Text fontWeight="strong" color="default">
                            Turn on notifications for threads and mentions?
                        </Text>
                        <Stack horizontal gap width="100%">
                            <Button size="button_sm" tone="level3" onClick={denyPushPermission}>
                                No thanks
                            </Button>

                            <Button size="button_sm" tone="cta1" onClick={requestPushPermission}>
                                Enable
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            )}
        </Stack>
    )
}
