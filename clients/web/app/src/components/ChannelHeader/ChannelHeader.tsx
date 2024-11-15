import React, { useCallback, useContext, useMemo } from 'react'
import {
    Address,
    useChannelMembers,
    useDMData,
    useMembers,
    useMuteSettings,
    useMyUserId,
    useRoom,
    useStreamUpToDate,
    useTownsContext,
} from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { isDefined } from '@river-build/sdk'
import { ChannelUsersPill } from '@components/ChannelUserPill/ChannelUserPill'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'
import { useUserList } from '@components/UserList/UserList'
import { Box, Button, CardHeader, Icon, IconButton, MotionStack, Paragraph, Stack, Text } from '@ui'
import { useChannelType } from 'hooks/useChannelType'
import { useDevice } from 'hooks/useDevice'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { AvatarGroup } from '@components/DirectMessages/GroupDMIcon'
import { Avatar } from '@components/Avatar/Avatar'
import { type CHANNEL_INFO_PARAMS_VALUES } from 'routes'
import { AnimatedLoaderGradient } from '@components/AnimatedLoaderGradient/AnimatedLoaderGradient'
import { FavoriteChannelButtonTouch } from '@components/FavoriteChannelButton/FavoriteChannelButton'
import { useFavoriteChannels } from 'hooks/useFavoriteChannels'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useChannelHeaderMembers } from 'hooks/useChannelHeaderMembers'
import { Analytics } from 'hooks/useAnalytics'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { TouchPanelContext } from '@components/Panel/Panel'
import { useChannelEntitlements } from 'hooks/useChannelEntitlements'

type Props = {
    channel: {
        id: string
        label: string
        topic?: string
    }
    spaceId: string | undefined
    onTouchClose?: () => void
}

type HeaderProps = {
    showLoadingIndicator: boolean
    hasSomeEntitlement: boolean | undefined
}

export const ChannelHeader = (props: Props) => {
    const { isTouch } = useDevice()
    const { upToDate } = useStreamUpToDate(props.channel.id)
    const { clientStatus } = useTownsContext()
    const myUserId = useMyUserId()
    const { memberIds } = useChannelMembers()

    const triggerClose = useContext(TouchPanelContext)?.triggerPanelClose

    const onTouchClose = useCallback(() => {
        triggerClose()
    }, [triggerClose])

    const isUserChannelMember = useMemo(
        () => (myUserId ? memberIds.includes(myUserId) : false),
        [memberIds, myUserId],
    )
    const showLoadingIndicator =
        (!upToDate || !clientStatus.streamSyncActive) && isUserChannelMember

    const { hasSomeEntitlement } = useChannelEntitlements({
        spaceId: props.spaceId,
        channelId: props.channel.id,
    })

    return isTouch ? (
        <TouchChannelHeader
            {...props}
            hasSomeEntitlement={hasSomeEntitlement}
            showLoadingIndicator={showLoadingIndicator}
            onTouchClose={onTouchClose}
        />
    ) : (
        <DesktopChannelHeader
            {...props}
            showLoadingIndicator={showLoadingIndicator}
            hasSomeEntitlement={hasSomeEntitlement}
        />
    )
}

const DesktopChannelHeader = (props: Props & HeaderProps) => {
    const { channel, spaceId, showLoadingIndicator } = props
    const { displayNotificationBanner, requestPushPermission, denyPushPermission } =
        usePushNotifications()
    const topic = useRoom(channel.id)?.topic

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
        Analytics.getInstance().track('clicked request notifications permission', tracked, () => {
            console.log('[analytics] clicked request notifications permission', tracked)
        })
        requestPushPermission()
    }, [channel.id, requestPushPermission, spaceId])

    const onClickDenyPermission = useCallback(() => {
        const tracked = {
            spaceId,
            channelId: channel.id,
        }
        Analytics.getInstance().track('clicked deny notifications permission', tracked, () => {
            console.log('[analytics] clicked deny notifications permission', tracked)
        })
        denyPushPermission()
    }, [channel.id, denyPushPermission, spaceId])

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
                    data-testid="channel-dm-title"
                >
                    {channelType === 'channel' ? (
                        <>
                            <Icon
                                type={props.hasSomeEntitlement ? 'lock' : 'tag'}
                                size="square_sm"
                                color="gray2"
                            />
                            <Paragraph fontWeight="strong" color="default">
                                {channel.label}
                            </Paragraph>
                        </>
                    ) : channelType === 'dm' ? (
                        <DMStreamTitle roomIdentifier={channel.id} />
                    ) : channelType === 'gdm' ? (
                        <GDMStreamTitle roomIdentifier={channel.id} />
                    ) : (
                        <></>
                    )}
                    {isMuted && <Icon type="muteActive" size="square_sm" color="gray2" />}
                </Stack>
                {topic && <Paragraph color="gray2">{topic}</Paragraph>}
                <Stack grow />
                {channelType !== 'dm' && (
                    <ChannelUsersPill channelId={channel.id} spaceId={spaceId} />
                )}
            </CardHeader>
            <AnimatePresence>{showLoadingIndicator && <AnimatedLoaderGradient />}</AnimatePresence>
            {displayNotificationBanner && (
                <Stack horizontal gap padding background="level3" alignItems="center">
                    <Text
                        fontWeight="strong"
                        color="default"
                        data-testid="enable-notifications-header"
                    >
                        Turn on notifications for threads, mentions and DMs?
                    </Text>
                    <Box grow />
                    <Button
                        size="button_sm"
                        tone="cta1"
                        data-testid="enable-notifications-header-button"
                        onClick={onClickRequestPermission}
                    >
                        Enable
                    </Button>
                    <Button
                        size="button_sm"
                        tone="level2"
                        data-testid="no-thanks-notifications-header-button"
                        onClick={onClickDenyPermission}
                    >
                        No thanks
                    </Button>
                </Stack>
            )}
        </>
    )
}

const DMStreamTitle = (props: { roomIdentifier: string }) => {
    const { counterParty } = useDMData(props.roomIdentifier)
    const userIds = useMemo(() => (counterParty ? [counterParty] : []), [counterParty])
    const isSelf = !counterParty
    const myUserId = useMyUserId()
    const title = useUserList({ userIds, excludeSelf: true, myUserId }).join('')

    const userId = isSelf ? myUserId : userIds[0]

    return (
        <>
            <MessageAvatarLayout userIds={[userId]} />
            <Text truncate fontSize="md" fontWeight="medium" color="default">
                {title}
            </Text>
        </>
    )
}

const GDMStreamTitle = (props: { roomIdentifier: string }) => {
    const { data } = useDMData(props.roomIdentifier)
    const userIds = useMemo(() => data?.userIds ?? [], [data?.userIds])
    const title =
        data?.properties?.name && data.properties.name.length > 0
            ? data?.properties?.name
            : undefined

    return (
        <>
            <MessageAvatarLayout userIds={userIds} />
            <MessageTitleLayout userIds={userIds} title={title} />
        </>
    )
}

export const MessageAvatarTitleLayout = (props: {
    userIds: (string | undefined)[]
    title?: string
}) => {
    return (
        <>
            <MessageAvatarLayout userIds={props.userIds} />
            <MessageTitleLayout userIds={props.userIds} title={props.title} />
        </>
    )
}

const MessageAvatarLayout = (props: { userIds: (string | undefined)[] }) => {
    const userIds = useMemo(() => props.userIds.filter(isDefined), [props.userIds])
    if (userIds.length === 1) {
        return <Avatar userId={userIds[0]} size="avatar_sm" />
    } else if (userIds.length > 1) {
        return <AvatarGroup userIds={userIds} width="x3" />
    } else {
        return <></>
    }
}

const MessageTitleLayout = (props: {
    myUserId?: string
    userIds: (string | undefined)[]
    title?: string
}) => {
    const userIds = useMemo(() => props.userIds.filter(isDefined), [props.userIds])
    const title = useUserList({
        userIds,
        excludeSelf: true,
        maxNames: 3,
        myUserId: props.myUserId,
    }).join('')
    return (
        <Text truncate fontSize="md" color="default">
            {props.title || title}
        </Text>
    )
}

const TouchChannelHeader = (props: Props & HeaderProps) => {
    const { channel, onTouchClose, showLoadingIndicator } = props
    const spaceId = useSpaceIdFromPathname()
    const memberIds = useChannelHeaderMembers(channel.id)
    const { favoriteChannelIds } = useFavoriteChannels()
    const { displayNotificationBanner, requestPushPermission, denyPushPermission } =
        usePushNotifications()
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
        Analytics.getInstance().track('clicked request notifications permission', tracked, () => {
            console.log('[analytics] clicked request notifications permission', tracked)
        })
        requestPushPermission()
    }, [channel.id, requestPushPermission, spaceId])

    const onClickDenyPermission = useCallback(() => {
        const tracked = {
            spaceId,
            channelId: channel.id,
        }
        Analytics.getInstance().track('clicked deny notifications permission', tracked, () => {
            console.log('[analytics] clicked deny notifications permission', tracked)
        })
        denyPushPermission()
    }, [channel.id, denyPushPermission, spaceId])

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
                            <Stack horizontal gap="xxs" alignContent="center">
                                <Icon
                                    type={props.hasSomeEntitlement ? 'lock' : 'tag'}
                                    size="square_xs"
                                    color="default"
                                />
                                <Paragraph truncate strong color="default" size="md">
                                    {channel.label}
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
                                <DMStreamTitle roomIdentifier={channel.id} />
                            ) : (
                                <GDMStreamTitle roomIdentifier={channel.id} />
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

    const { memberIds } = useMembers(channelId)
    const myUserId = useMyUserId()

    const friendDM = useMemo(() => {
        const isPersonalSpace = memberIds.length === 1
        return isPersonalSpace ? memberIds[0] : memberIds.find((u) => u !== myUserId)
    }, [memberIds, myUserId])

    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: friendDM as Address | undefined,
    })

    return useCallback(() => {
        if (type === 'dm' && abstractAccountAddress) {
            openPanel('profile', { profileId: abstractAccountAddress })
        } else {
            openPanel(type, { channelId, stackId: searchParams.get('stackId') ?? '' })
        }
    }, [abstractAccountAddress, channelId, openPanel, searchParams, type])
}
