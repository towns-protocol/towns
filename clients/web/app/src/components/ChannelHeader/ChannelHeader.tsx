import React, { useCallback } from 'react'
import { Channel, RoomIdentifier, useChannelMembers, useRoom } from 'use-zion-client'
import { Link, useNavigate } from 'react-router-dom'
import { ChannelUsersPill } from '@components/ChannelUserPill/ChannelUserPill'
import { Box, Button, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { useMuteSettings } from 'api/lib/notificationSettings'
import { PATHS } from 'routes'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'

type Props = {
    channel: Channel
    spaceId: RoomIdentifier
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
    const { channel } = props
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

    const homeButtonPressed = useCallback(() => {
        navigate(`/${PATHS.SPACES}/${spaceId}/home`)
    }, [navigate, spaceId])

    const infoButtonPressed = useCallback(() => {
        navigate(`info?channel`)
    }, [navigate])

    return (
        <Stack gap="sm">
            <Box borderBottom paddingTop="safeAreaInsetTop" background="level1">
                <Stack horizontal alignContent="center" gap="sm" zIndex="uiAbove" padding="sm">
                    <IconButton
                        icon="back"
                        size="square_md"
                        color="default"
                        onClick={homeButtonPressed}
                    />
                    <Stack gap="sm" onClick={infoButtonPressed}>
                        <Stack horizontal gap="sm" alignContent="center">
                            <Text fontWeight="strong" color="default">
                                #{channel.label}
                            </Text>
                            {isMuted && <Icon type="muteActive" size="square_xxs" color="gray2" />}
                        </Stack>
                        <Text color="gray2" fontSize="sm">{`${members.length} member${
                            members.length > 1 ? `s` : ``
                        }`}</Text>
                    </Stack>

                    <Box grow />
                    <IconButton
                        icon="info"
                        size="square_sm"
                        color="default"
                        onClick={infoButtonPressed}
                    />
                </Stack>
            </Box>
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
