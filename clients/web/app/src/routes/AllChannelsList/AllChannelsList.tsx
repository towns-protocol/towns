import React, { useCallback, useEffect, useMemo } from 'react'
import {
    ChannelContextProvider,
    Membership,
    Permission,
    SpaceData,
    useConnectivity,
    useHasPermission,
    useMyChannels,
    useMyMemberships,
    useSpaceData,
    useTownsClient,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { useNavigate } from 'react-router'

import { Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { useChannelIdFromPathname } from 'hooks/useChannelIdFromPathname'
import { useDevice } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useUnseenChannelIds } from 'hooks/useUnseenChannelIdsCount'
import { LinkParams, useCreateLink } from 'hooks/useCreateLink'
import { Analytics } from 'hooks/useAnalytics'
import { useLeaveChannel } from 'hooks/useLeaveChannel'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { useChannelEntitlements } from 'hooks/useChannelEntitlements'
import { TokenTypePill } from '@components/Web3/TokenTypePill'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

export const AllChannelsList = ({
    onHideBrowseChannels,
}: {
    onHideBrowseChannels?: () => void
}) => {
    const space = useSpaceData()
    const { isTouch } = useDevice()
    const channels = useSpaceChannels()
    const myMemberships = useMyMemberships()
    const { unseenChannelIds } = useUnseenChannelIds()

    return (
        <Stack height="100%">
            {space && !space?.isLoadingChannels && channels.length > 0 ? (
                <>
                    {!isTouch && (
                        <Stack
                            horizontal
                            justifyContent="spaceBetween"
                            alignItems="center"
                            paddingTop="sm"
                            paddingX="sm"
                            paddingBottom="x4"
                        >
                            <Text size="lg" fontWeight="strong">
                                Browse channels
                            </Text>

                            {onHideBrowseChannels && (
                                <IconButton
                                    color="default"
                                    icon="close"
                                    label="close"
                                    onClick={onHideBrowseChannels}
                                />
                            )}
                        </Stack>
                    )}
                    <Stack
                        scroll
                        scrollbars
                        gap="lg"
                        maxHeight={isTouch ? undefined : '400'}
                        minHeight={isTouch ? 'forceScroll' : undefined}
                        padding="sm"
                    >
                        {channels?.map((channel) => (
                            <ChannelContextProvider key={channel.id} channelId={channel.id}>
                                <Stack>
                                    <ChannelItem
                                        space={space}
                                        name={channel.label}
                                        topic={channel.topic}
                                        channelNetworkId={channel.id}
                                        showDot={unseenChannelIds.has(channel.id)}
                                        isJoined={myMemberships[channel.id] === Membership.Join}
                                    />
                                </Stack>
                            </ChannelContextProvider>
                        ))}
                    </Stack>
                </>
            ) : (
                <Stack centerContent padding gap="md">
                    <Text>Loading channels</Text>
                    <ButtonSpinner />
                </Stack>
            )}
        </Stack>
    )
}

export const ChannelItem = ({
    name,
    topic,
    channelNetworkId,
    space,
    showDot,
    isJoined,
    onOpenChannel,
}: {
    name: string
    topic?: string
    channelNetworkId: string
    space: SpaceData
    showDot?: boolean
    isJoined?: boolean
    onOpenChannel?: (channelId: string) => void
}) => {
    const navigate = useNavigate()
    const channelIdentifier = channelNetworkId
    const { createLink } = useCreateLink()
    const { isTouch } = useDevice()

    const { tokenTypes, hasSomeEntitlement } = useChannelEntitlements({
        spaceId: space?.id,
        channelId: channelNetworkId,
    })

    const { loggedInWalletAddress } = useConnectivity()

    const { hasPermission: canJoinChannel } = useHasPermission({
        walletAddress: loggedInWalletAddress,
        spaceId: space.id,
        channelId: channelNetworkId,
        permission: Permission.Read,
    })
    const { openPanel } = usePanelActions()

    const { syncingSpace, joinFailed, setSyncingSpace, onClick } = useOnJoinChannel({
        channelId: channelNetworkId,
        space,
        isJoined,
    })

    useEffect(() => {
        // quick fix, leave events result in a faster rerender than the join event
        if (!isJoined) {
            const timeout = setTimeout(() => {
                setSyncingSpace(false)
            }, 500)
            return () => {
                clearTimeout(timeout)
            }
        } else {
            setSyncingSpace(false)
        }
    }, [isJoined, setSyncingSpace])

    const onJoinClick = useEvent(async () => {
        if (!canJoinChannel) {
            openPanel(CHANNEL_INFO_PARAMS.ROLE_RESTRICTED_CHANNEL_JOIN, {
                data: channelIdentifier,
            })
            Analytics.getInstance().track('clicked join gated channel button', {
                spaceId: space.id,
                channelId: channelIdentifier,
            })
            return
        }

        await onClick()
    })

    const onOpenChannelClick = useEvent(() => {
        const linkParams: LinkParams = {
            spaceId: space.id,
            channelId: channelIdentifier,
            ...(isTouch ? {} : { panel: 'browse-channels' }),
        }
        const link = createLink(linkParams)
        if (link) {
            navigate(link)
        }
        onOpenChannel && onOpenChannel(channelIdentifier)
    })

    return (
        <Stack>
            <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                <Stack
                    horizontal
                    grow
                    gap="sm"
                    overflow="hidden"
                    cursor="pointer"
                    alignItems="center"
                    onClick={onOpenChannelClick}
                >
                    <Icon
                        type={hasSomeEntitlement ? 'lock' : 'tag'}
                        padding="line"
                        background="level2"
                        size="square_lg"
                    />
                    <Stack gap="sm" overflow="hidden" padding="sm">
                        <Stack horizontal shrink={false} gap="sm" alignItems="center">
                            <Text truncate color="gray1" textAlign="left">
                                {name}{' '}
                            </Text>
                            {tokenTypes?.map((t) => (
                                <TokenTypePill key={t} type={t} />
                            ))}
                            {showDot && (
                                <Box
                                    shrink={false}
                                    width="x1"
                                    height="x1"
                                    background="accent"
                                    rounded="full"
                                />
                            )}
                        </Stack>
                        {topic && (
                            <Text color="gray2" size="sm">
                                {topic}
                            </Text>
                        )}
                    </Stack>
                </Stack>

                <Button
                    disabled={syncingSpace}
                    minWidth="100"
                    size="button_sm"
                    rounded="sm"
                    hoverEffect="none"
                    tone={syncingSpace ? 'level3' : isJoined ? 'level3' : 'cta1'}
                    onClick={onJoinClick}
                >
                    {syncingSpace ? <ButtonSpinner /> : isJoined ? 'Leave' : 'Join'}
                </Button>
            </Stack>
            {joinFailed && (
                <Box maxWidth="350" paddingTop="sm">
                    <Text textAlign="center" color="gray2" size="sm">
                        You are unable to join either because you don&apos;t have permission or this
                        town has reached its capacity
                    </Text>
                </Box>
            )}
        </Stack>
    )
}

export function useOnJoinChannel(props: {
    channelId: string | undefined
    space: SpaceData | undefined
    isJoined?: boolean
}) {
    const { channelId, space, isJoined } = props
    const [syncingSpace, setSyncingSpace] = React.useState(false)
    const [joinFailed, setJoinFailed] = React.useState(false)
    const setTownRouteBookmark = useStore((s) => s.setTownRouteBookmark)

    const groups = useMyChannels(space)
    const myJoinedChannelsInSpace = useMemo(() => groups.flatMap((c) => c.channels), [groups])
    const { leaveChannel } = useLeaveChannel()
    const { addChannelNotificationSettings, removeChannelNotificationSettings } =
        useNotificationSettings()
    const navigate = useNavigate()
    const { client } = useTownsClient()

    const currentChannelId = useChannelIdFromPathname()
    const { createLink } = useCreateLink()
    const { closePanel } = usePanelActions()

    const onClick = useCallback(
        async (
            { navigateWithPanel }: { navigateWithPanel?: boolean } = {
                navigateWithPanel: true,
            },
        ) => {
            if (!channelId || !space) {
                return
            }
            setSyncingSpace(true)
            setJoinFailed(false)

            const tracked = {
                spaceId: space.id,
                channelId: channelId,
                isJoined: isJoined ? 'leave' : 'join',
            }
            Analytics.getInstance().track('clicked join / leave channel', tracked, () => {
                console.log('[analytics] track', 'clicked join / leave channel', tracked)
            })

            const flatChannels = space.channelGroups.flatMap((g) => g.channels)
            const joinedChannels = flatChannels.filter((flatChannel) =>
                myJoinedChannelsInSpace.some(
                    (joinedChannel) => joinedChannel.id === flatChannel.id,
                ),
            )

            const indexOfThisChannel = flatChannels.findIndex((c) => c.id === channelId)

            if (isJoined) {
                await leaveChannel(channelId, space.id)
                await removeChannelNotificationSettings(channelId)
                if (currentChannelId === channelId) {
                    // leaving the last channel
                    if (joinedChannels.length === 1) {
                        setTownRouteBookmark(space.id, '')
                        navigate(`/${PATHS.SPACES}/${space.id}/`)
                    }
                    // go to the next channel
                    else if (indexOfThisChannel === 0) {
                        navigate(
                            `/${PATHS.SPACES}/${space.id}/${PATHS.CHANNELS}/${
                                joinedChannels[indexOfThisChannel + 1].id
                            }/`,
                        )
                    }
                    // go to the previous channel
                    else {
                        navigate(
                            `/${PATHS.SPACES}/${space.id}/${PATHS.CHANNELS}/${
                                flatChannels[indexOfThisChannel - 1].id
                            }/`,
                        )
                    }
                }
                return true
            } else {
                try {
                    const room = await client?.joinRoom(channelId, space.id)

                    const linkConfig: {
                        spaceId: string
                        channelId: string
                        panel?: string
                    } = {
                        spaceId: space.id,
                        channelId: channelId,
                    }

                    // don't set panel to undefined b/c createLink won't match the path
                    if (navigateWithPanel) {
                        linkConfig.panel = 'browse-channels'
                    }
                    const link = createLink(linkConfig)

                    if (link) {
                        if (!navigateWithPanel) {
                            closePanel({ force: true })
                        }
                        navigate(link)
                    }
                    if (!room) {
                        console.error('[AllChannelsList]', 'cannot join channel', room)
                        throw new Error('cannot join channel')
                    }
                    addChannelNotificationSettings({
                        channelId: channelId,
                        spaceId: space.id,
                    }).catch((error) => {
                        console.warn(
                            '[AllChannelList',
                            'cannot add channel notification settings',
                            error,
                        )
                    })
                    console.log('[AllChannelsList]', 'joined room', 'room', room)
                    return true
                } catch (e) {
                    console.warn(
                        '[AllChannelsList]',
                        'cannot join channel',
                        `{ name: ${name}, networkId: ${channelId} }`,
                        e,
                    )
                    setJoinFailed(true)
                    return false
                } finally {
                    setSyncingSpace(false)
                }
            }
        },
        [
            addChannelNotificationSettings,
            channelId,
            client,
            closePanel,
            createLink,
            currentChannelId,
            isJoined,
            leaveChannel,
            myJoinedChannelsInSpace,
            navigate,
            removeChannelNotificationSettings,
            setTownRouteBookmark,
            space,
        ],
    )

    return useMemo(() => {
        return {
            syncingSpace,
            setSyncingSpace,
            setJoinFailed,
            joinFailed,
            onClick,
        }
    }, [joinFailed, onClick, syncingSpace])
}
