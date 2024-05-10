import React, { useEffect, useMemo } from 'react'
import {
    ChannelContextProvider,
    Membership,
    SpaceData,
    useMyChannels,
    useMyMemberships,
    useSpaceData,
    useTownsClient,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { useNavigate } from 'react-router'

import { Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { PATHS } from 'routes'
import { useChannelIdFromPathname } from 'hooks/useChannelIdFromPathname'
import { useDevice } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useUnseenChannelIds } from 'hooks/useUnseenChannelIdsCount'
import { LinkParams, useCreateLink } from 'hooks/useCreateLink'

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
    const { client, leaveRoom } = useTownsClient()
    const channelIdentifier = channelNetworkId
    const currentChannelId = useChannelIdFromPathname()
    const { createLink } = useCreateLink()
    const groups = useMyChannels(space)
    const myJoinedChannelsInSpace = useMemo(() => groups.flatMap((c) => c.channels), [groups])
    const { isTouch } = useDevice()

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
    }, [isJoined])

    const [syncingSpace, setSyncingSpace] = React.useState(false)
    const [joinFailed, setJoinFailed] = React.useState(false)
    const setTownRouteBookmark = useStore((s) => s.setTownRouteBookmark)

    const onJoinClick = useEvent(async () => {
        setSyncingSpace(true)
        setJoinFailed(false)

        const flatChannels = space.channelGroups.flatMap((g) => g.channels)
        const joinedChannels = flatChannels.filter((flatChannel) =>
            myJoinedChannelsInSpace.some((joinedChannel) => joinedChannel.id === flatChannel.id),
        )

        const indexOfThisChannel = flatChannels.findIndex((c) => c.id === channelIdentifier)

        if (isJoined) {
            await leaveRoom(channelIdentifier, space.id)
            if (currentChannelId === channelIdentifier) {
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
        } else {
            try {
                const link = createLink({
                    spaceId: space.id,
                    channelId: channelIdentifier,
                    panel: 'browse-channels',
                })
                if (link) {
                    navigate(link)
                }
                const room = await client?.joinRoom(channelIdentifier, space.id)
                if (!room) {
                    console.error('[AllChannelsList]', 'cannot join channel', room)
                    throw new Error('cannot join channel')
                }
                console.log('[AllChannelsList]', 'joined room', 'room', room)
            } catch (e) {
                console.warn(
                    '[AllChannelsList]',
                    'cannot join channel',
                    `{ name: ${name}, networkId: ${channelNetworkId} }`,
                    e,
                )
                setJoinFailed(true)
            } finally {
                setSyncingSpace(false)
            }
        }
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
                    centerContent
                    gap="sm"
                    overflow="hidden"
                    cursor="pointer"
                    onClick={onOpenChannelClick}
                >
                    <Icon type="tag" padding="line" background="level2" size="square_lg" />
                    <Stack gap="sm" overflow="hidden" padding="sm">
                        <Stack horizontal shrink={false} gap="sm" alignItems="center">
                            <Text truncate color="gray1" textAlign="left">
                                {name}
                            </Text>
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
