import React, { useCallback, useMemo } from 'react'
import { Channel, RoomIdentifier, useChannelMembers, useDMData, useRoom } from 'use-zion-client'
import { Link, useNavigate } from 'react-router-dom'
import { ChannelUsersPill } from '@components/ChannelUserPill/ChannelUserPill'
import { Box, Button, Icon, IconButton, MotionStack, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { useMuteSettings } from 'api/lib/notificationSettings'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'
import { useChannelType } from 'hooks/useChannelType'
import { GroupDMIcon } from '@components/DirectMessages/GroupDMIcon'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useUserList } from '@components/UserList/UserList'
import { Avatar } from '@components/Avatar/Avatar'

type Props = {
    channel: Channel
    spaceId: RoomIdentifier | undefined
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
        spaceId: spaceId?.networkId,
        channelId: channel.id.networkId,
    })
    const isMuted = channelIsMuted || spaceIsMuted
    const channelType = useChannelType(channel.id)

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
                        Turn on notifications for threads, mentions and DMs?
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
                <Link to={`${CHANNEL_INFO_PARAMS.INFO}?${CHANNEL_INFO_PARAMS.CHANNEL}`}>
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
                        {channelType === 'channel' ? (
                            <>
                                <Icon type="tag" size="square_sm" color="gray2" />
                                <Paragraph fontWeight="strong" color="default">
                                    {channel.label}
                                </Paragraph>
                            </>
                        ) : channelType === 'dm' ? (
                            <DMTitleContent roomIdentifier={channel.id} />
                        ) : channelType === 'gdm' ? (
                            <GDMTitleContent roomIdentifier={channel.id} />
                        ) : (
                            <></>
                        )}
                        {isMuted && <Icon type="muteActive" size="square_sm" color="gray2" />}
                    </Stack>
                </Link>

                {topic && <Paragraph color="gray2">{topic}</Paragraph>}
                <Stack grow />

                {channelType === 'channel' && (
                    <ChannelUsersPill channelId={channel.id} spaceId={spaceId} />
                )}
            </Stack>
        </Stack>
    )
}

const DMTitleContent = (props: { roomIdentifier: RoomIdentifier }) => {
    const { counterParty } = useDMData(props.roomIdentifier)
    const userIds = useMemo(() => (counterParty ? [counterParty] : []), [counterParty])
    const title = useUserList({ userIds, excludeSelf: true }).join('')
    if (!counterParty) {
        return undefined
    }
    return (
        <>
            <Avatar userId={counterParty} size="avatar_sm" />
            <Text truncate fontSize="md" fontWeight="medium" color="default">
                {title}
            </Text>
        </>
    )
}

const GDMTitleContent = (props: { roomIdentifier: RoomIdentifier }) => {
    const { data } = useDMData(props.roomIdentifier)
    const userIds = useMemo(() => data?.userIds ?? [], [data?.userIds])
    const title = useUserList({ userIds, excludeSelf: true }).join('')

    return (
        <>
            <GroupDMIcon roomIdentifier={props.roomIdentifier} width="x3" letterFontSize="sm" />
            <Text fontSize="md" fontWeight="medium" color="default">
                {title}
            </Text>
        </>
    )
}

const TouchChannelHeader = (props: Props) => {
    const { channel, onTouchClose } = props
    const navigate = useNavigate()
    const spaceId = useSpaceIdFromPathname()
    const { members } = useChannelMembers()
    const { displayNotificationBanner, requestPushPermission, denyPushPermission } =
        usePushNotifications()
    const channelType = useChannelType(channel.id)
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
                extraHeight
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
                <MotionStack
                    hoverable
                    gap="sm"
                    whileTap={{ opacity: '0.7' }}
                    onClick={infoButtonPressed}
                >
                    {channelType === 'channel' ? (
                        <>
                            <Stack horizontal gap="sm" alignContent="center">
                                <Paragraph truncate strong color="default" size="lg">
                                    #{channel.label}
                                </Paragraph>
                                {isMuted && (
                                    <Icon type="muteActive" size="square_xxs" color="gray2" />
                                )}
                            </Stack>

                            <Paragraph truncate color="gray2" size="sm">
                                {`${members.length} member${members.length > 1 ? `s` : ``}`}
                                {channel.topic ? ` · ${channel.topic.toLocaleLowerCase()}` : ``}
                            </Paragraph>
                        </>
                    ) : (
                        <Stack horizontal gap="sm" alignItems="center" overflow="hidden">
                            {channelType === 'dm' ? (
                                <DMTitleContent roomIdentifier={channel.id} />
                            ) : (
                                <GDMTitleContent roomIdentifier={channel.id} />
                            )}
                            {isMuted && <Icon type="muteActive" size="square_xxs" color="gray2" />}
                        </Stack>
                    )}
                </MotionStack>
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
                            Turn on notifications for threads, mentions and DMs?
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
