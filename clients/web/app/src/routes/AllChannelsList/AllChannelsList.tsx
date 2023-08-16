import React, { useEffect } from 'react'
import {
    Membership,
    SpaceData,
    makeRoomIdentifier,
    useSpaceData,
    useZionClient,
} from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { useNavigate } from 'react-router'

import { Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { PATHS } from 'routes'
import { useChannelIdFromPathname } from 'hooks/useChannelIdFromPathname'
import { useDevice } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { useContractChannelsWithJoinedStatus } from 'hooks/useContractChannelsWithJoinedStatus'

export const AllChannelsList = ({
    onHideBrowseChannels,
}: {
    onHideBrowseChannels?: () => void
}) => {
    const space = useSpaceData()
    const { isTouch } = useDevice()
    const { contractChannelsWithJoinedStatus } = useContractChannelsWithJoinedStatus()

    return (
        <Stack height="100%">
            {space && !space?.isLoadingChannels && contractChannelsWithJoinedStatus.length > 0 ? (
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
                        {contractChannelsWithJoinedStatus?.map((channel) => (
                            <Stack key={channel.channelNetworkId}>
                                <ChannelItem
                                    space={space}
                                    name={channel.name}
                                    isJoined={channel.isJoined}
                                    channelNetworkId={channel.channelNetworkId}
                                />
                            </Stack>
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
    channelNetworkId,
    isJoined,
    space,
}: {
    name: string
    channelNetworkId: string
    isJoined: boolean
    space: SpaceData
}) => {
    const navigate = useNavigate()
    const { client, leaveRoom } = useZionClient()
    const channelIdentifier = makeRoomIdentifier(channelNetworkId)
    const currentChannelId = useChannelIdFromPathname()

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

    const onClick = useEvent(async () => {
        setSyncingSpace(true)
        setJoinFailed(false)

        const flatChannels = space.channelGroups.flatMap((g) => g.channels)
        const joinedChannels = flatChannels.filter((c) => {
            const roomData = client?.getRoomData(c.id)
            return roomData ? roomData.membership === Membership.Join : false
        })

        const indexOfThisChannel = flatChannels.findIndex(
            (c) => c.id.networkId === channelIdentifier.networkId,
        )

        if (isJoined) {
            await leaveRoom(channelIdentifier, space.id.networkId)
            if (currentChannelId === channelIdentifier.networkId) {
                // leaving the last channel
                if (joinedChannels.length === 1) {
                    setTownRouteBookmark(space.id.slug, '')
                    navigate(`/${PATHS.SPACES}/${space.id.slug}/`)
                }
                // go to the next channel
                else if (indexOfThisChannel === 0) {
                    navigate(
                        `/${PATHS.SPACES}/${space.id.slug}/${PATHS.CHANNELS}/${
                            joinedChannels[indexOfThisChannel + 1].id.slug
                        }/`,
                    )
                }
                // go to the previous channel
                else {
                    navigate(
                        `/${PATHS.SPACES}/${space.id.slug}/${PATHS.CHANNELS}/${
                            flatChannels[indexOfThisChannel - 1].id.slug
                        }/`,
                    )
                }
            }
        } else {
            try {
                const room = await client?.joinRoom(channelIdentifier, space.id.networkId)
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

    return (
        <Stack>
            <Stack horizontal justifyContent="spaceBetween">
                <Stack horizontal centerContent gap="sm">
                    <Icon type="tag" padding="line" background="level2" size="square_lg" />
                    <Text color="gray1">{name}</Text>
                </Stack>
                <Button
                    disabled={syncingSpace}
                    minWidth="100"
                    size="button_sm"
                    rounded="sm"
                    hoverEffect="none"
                    tone={syncingSpace ? 'level3' : isJoined ? 'level3' : 'cta1'}
                    onClick={onClick}
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
