import React, { useCallback, useMemo } from 'react'
import {
    Channel,
    useChannelMembers,
    useDMData,
    useMyUserId,
    useRoom,
    useStreamUpToDate,
    useTownsContext,
} from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { ChannelUsersPill } from '@components/ChannelUserPill/ChannelUserPill'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'
import { useUserList } from '@components/UserList/UserList'
import { Box, Button, CardHeader, Icon, IconButton, MotionStack, Paragraph, Stack, Text } from '@ui'
import { useMuteSettings } from 'api/lib/notificationSettings'
import { useChannelType } from 'hooks/useChannelType'
import { useDevice } from 'hooks/useDevice'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { AvatarGroup } from '@components/DirectMessages/GroupDMIcon'
import { Avatar } from '@components/Avatar/Avatar'
import type { CHANNEL_INFO_PARAMS_VALUES } from 'routes'
import { AnimatedLoaderGradient } from '@components/AnimatedLoaderGradient/AnimatedLoaderGradient'
import { FavoriteChannelButtonTouch } from '@components/FavoriteChannelButton/FavoriteChannelButton'
import { useFavoriteChannels } from 'hooks/useFavoriteChannels'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useChannelHeaderMembers } from 'hooks/useChannelHeaderMembers'
import { useAnalytics } from 'hooks/useAnalytics'

type Props = {
    channel: Channel
    spaceId: string | undefined
    onTouchClose?: () => void
}

export const ChannelHeader = (props: Props) => {
    const { isTouch } = useDevice()
    const { upToDate } = useStreamUpToDate(props.channel.id)
    const { clientStatus } = useTownsContext()
    const channelMembers = useChannelMembers()
    const myUserId = useMyUserId()
    const isUserChannelMember = useMemo(
        () => (myUserId ? channelMembers.memberIds.includes(myUserId) : false),
        [channelMembers.memberIds, myUserId],
    )
    const showLoadingIndicator =
        (!upToDate || !clientStatus.streamSyncActive) && isUserChannelMember

    return isTouch ? (
        <TouchChannelHeader {...props} showLoadingIndicator={showLoadingIndicator} />
    ) : (
        <DesktopChannelHeader {...props} showLoadingIndicator={showLoadingIndicator} />
    )
}

const DesktopChannelHeader = (props: Props & { showLoadingIndicator: boolean }) => {
    const { channel, spaceId, showLoadingIndicator } = props
    const { displayNotificationBanner, requestPushPermission, denyPushPermission } =
        usePushNotifications()
    const topic = useRoom(channel.id)?.topic
    const { analytics } = useAnalytics()

    const { channelIsMuted, spaceIsMuted } = useMuteSettings({
        spaceId: spaceId,
        channelId: channel.id,
    })
    const isMuted = channelIsMuted || spaceIsMuted
    const channelType = useChannelType(channel.id)
    const onInfoPressed = useChannelInfoButton(channelType, channel.id)

    const onClickRequestPermission = useCallback(() => {
        const tracked = {
            spaceId,
            channelId: channel.id,
        }
        analytics?.track('clicked request notifications permission', tracked, () => {
            console.log('[analytics] clicked request notifications permission', tracked)
        })
        requestPushPermission()
    }, [analytics, channel.id, requestPushPermission, spaceId])

    const onClickDenyPermission = useCallback(() => {
        const tracked = {
            spaceId,
            channelId: channel.id,
        }
        analytics?.track('clicked deny notifications permission', tracked, () => {
            console.log('[analytics] clicked deny notifications permission', tracked)
        })
        denyPushPermission()
    }, [analytics, channel.id, denyPushPermission, spaceId])

    return (
        <>
            <CardHeader gap="sm" onClick={onInfoPressed}>
                <Stack
                    horizontal
                    hoverable
                    paddingX="sm"
                    insetX="xs"
                    gap="sm"
                    alignItems="center"
                    rounded="sm"
                    minHeight="x4"
                    cursor="pointer"
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
                {topic && <Paragraph color="gray2">{topic}</Paragraph>}
                <Stack grow />
                {channelType === 'channel' && (
                    <ChannelUsersPill channelId={channel.id} spaceId={spaceId} />
                )}
            </CardHeader>
            <AnimatePresence>{showLoadingIndicator && <AnimatedLoaderGradient />}</AnimatePresence>
            {displayNotificationBanner && (
                <Stack horizontal gap padding background="level3" alignItems="center">
                    <Text fontWeight="strong" color="default">
                        Turn on notifications for threads, mentions and DMs?
                    </Text>
                    <Box grow />
                    <Button size="button_sm" tone="cta1" onClick={onClickRequestPermission}>
                        Enable
                    </Button>
                    <Button size="button_sm" tone="level2" onClick={onClickDenyPermission}>
                        No thanks
                    </Button>
                </Stack>
            )}
        </>
    )
}

const DMTitleContent = (props: { roomIdentifier: string }) => {
    const { counterParty } = useDMData(props.roomIdentifier)

    const userIds = useMemo(() => (counterParty ? [counterParty] : []), [counterParty])
    const isSelf = !counterParty
    const myUserId = useMyUserId()
    const title = useUserList({ userIds, excludeSelf: true, myUserId }).join('')

    return (
        <>
            <Avatar userId={isSelf ? myUserId : userIds[0]} size="avatar_sm" />
            <Text truncate fontSize="md" fontWeight="medium" color="default">
                {title}
            </Text>
        </>
    )
}

const GDMTitleContent = (props: { roomIdentifier: string }) => {
    const { data } = useDMData(props.roomIdentifier)
    const userIds = useMemo(() => data?.userIds ?? [], [data?.userIds])
    const userListTitle = useUserList({ userIds, excludeSelf: true, maxNames: 3 }).join('')
    const title =
        data?.properties?.name && data.properties.name.length > 0
            ? data?.properties?.name
            : userListTitle
    return (
        <>
            <AvatarGroup userIds={userIds} width="x3" />
            <Text truncate fontSize="md" color="default">
                {title}
            </Text>
        </>
    )
}

const TouchChannelHeader = (props: Props & { showLoadingIndicator: boolean }) => {
    const { channel, onTouchClose, showLoadingIndicator } = props
    const spaceId = useSpaceIdFromPathname()
    const memberIds = useChannelHeaderMembers(channel.id)
    const { favoriteChannelIds } = useFavoriteChannels()
    const { displayNotificationBanner, requestPushPermission, denyPushPermission } =
        usePushNotifications()
    const { analytics } = useAnalytics()
    const channelType = useChannelType(channel.id)
    const { channelIsMuted, spaceIsMuted } = useMuteSettings({
        spaceId: spaceId,
        channelId: channel?.id,
    })

    const isFavorite = favoriteChannelIds.has(channel.id)
    const isMuted = channelIsMuted || spaceIsMuted
    const infoButtonPressed = useChannelInfoButton(channelType, channel.id)

    const showMembersCount = memberIds.length > 0

    const onClickRequestPermission = useCallback(() => {
        const tracked = {
            spaceId,
            channelId: channel.id,
        }
        analytics?.track('clicked request notifications permission', tracked, () => {
            console.log('[analytics] clicked request notifications permission', tracked)
        })
        requestPushPermission()
    }, [analytics, channel.id, requestPushPermission, spaceId])

    const onClickDenyPermission = useCallback(() => {
        const tracked = {
            spaceId,
            channelId: channel.id,
        }
        analytics?.track('clicked deny notifications permission', tracked, () => {
            console.log('[analytics] clicked deny notifications permission', tracked)
        })
        denyPushPermission()
    }, [analytics, channel.id, denyPushPermission, spaceId])

    return (
        <Stack gap="sm">
            <TouchNavBar
                extraHeight
                showLoadingIndicator={showLoadingIndicator}
                contentLeft={
                    <IconButton
                        icon="back"
                        size="square_md"
                        color="default"
                        onClick={onTouchClose}
                    />
                }
                contentRight={
                    <Stack horizontal alignItems="center" gap="sm" shrink={false}>
                        <FavoriteChannelButtonTouch channelId={channel.id} favorite={isFavorite} />
                        <IconButton
                            icon="info"
                            size="square_md"
                            color="default"
                            onClick={infoButtonPressed}
                        />
                    </Stack>
                }
            >
                <MotionStack
                    hoverable
                    gap="sm"
                    whileTap={{ opacity: '0.7' }}
                    paddingRight="sm"
                    onClick={infoButtonPressed}
                >
                    {channelType === 'channel' ? (
                        <>
                            <Stack horizontal gap="sm" alignContent="center">
                                <Paragraph truncate strong color="default" size="md">
                                    #{channel.label}
                                </Paragraph>
                                {isMuted && (
                                    <Box>
                                        <Icon type="muteActive" size="square_xs" color="gray2" />
                                    </Box>
                                )}
                            </Stack>

                            <Paragraph truncate color="gray2" size="sm">
                                {showMembersCount && (
                                    <>
                                        {`${memberIds.length} member${
                                            memberIds.length > 1 ? `s` : ``
                                        }`}
                                        {channel.topic
                                            ? ` · ${channel.topic.toLocaleLowerCase()}`
                                            : ``}
                                    </>
                                )}
                            </Paragraph>
                        </>
                    ) : (
                        <Stack horizontal gap="sm" alignItems="center" overflow="hidden">
                            {channelType === 'dm' ? (
                                <DMTitleContent roomIdentifier={channel.id} />
                            ) : (
                                <GDMTitleContent roomIdentifier={channel.id} />
                            )}
                            {isMuted && <Icon type="muteActive" size="square_xs" color="gray2" />}
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
                            <Button size="button_sm" tone="level3" onClick={onClickDenyPermission}>
                                No thanks
                            </Button>

                            <Button size="button_sm" tone="cta1" onClick={onClickRequestPermission}>
                                Enable
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            )}
        </Stack>
    )
}

const useChannelInfoButton = (type: CHANNEL_INFO_PARAMS_VALUES, channelId: string) => {
    const [searchParams] = useSearchParams()
    const { openPanel } = usePanelActions()
    return useCallback(() => {
        openPanel(type, { channelId, stackId: searchParams.get('stackId') ?? '' })
    }, [channelId, openPanel, searchParams, type])
}
