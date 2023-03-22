import React, { useEffect, useMemo } from 'react'
import {
    Membership,
    SpaceData,
    makeRoomIdentifier,
    useSpaceData,
    useZionClient,
} from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { useContractChannels } from 'hooks/useContractChannels'
import { Button, Icon, Stack, Text } from '@ui'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { CentralPanelLayout } from 'routes/layouts/CentralPanelLayout'

export const AllChannelsList = () => {
    const space = useSpaceData()
    const { client } = useZionClient()
    // matrix doesn't always sync left rooms. For example if you leave a room, and all other members leave it too. And there may be other unexpected cases.
    // matrix sdk .syncLeftRooms() returns empty array
    // so using blockchain data to get all the channels
    const { data: contractChannels } = useContractChannels(space?.id.networkId)
    const matrixSyncedChannels = useSpaceChannels()

    const contractChannelsWithJoinedStatus = useMemo(() => {
        if (!contractChannels || space?.isLoadingChannels) {
            return []
        }
        return contractChannels.map((c) => {
            const syncedEq = matrixSyncedChannels?.find(
                (m) => m.id.networkId === c.channelNetworkId,
            )
            if (!syncedEq) {
                return {
                    ...c,
                    isJoined: false,
                }
            }
            const roomData = client?.getRoomData(syncedEq.id)
            return {
                ...c,
                isJoined: roomData ? roomData.membership === Membership.Join : false,
            }
        })
    }, [client, contractChannels, matrixSyncedChannels, space?.isLoadingChannels])

    return (
        <CentralPanelLayout>
            <Stack absoluteFill overflowY="scroll">
                <Stack grow padding>
                    {space &&
                    !space?.isLoadingChannels &&
                    contractChannelsWithJoinedStatus.length > 0 ? (
                        <>
                            <Stack
                                horizontal
                                justifyContent="spaceBetween"
                                alignItems="center"
                                paddingBottom="lg"
                            >
                                <Text size="lg" fontWeight="strong">
                                    Browse channels
                                </Text>
                            </Stack>
                            <Stack gap="lg">
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
                        <Stack absoluteFill centerContent gap="md">
                            <Text>Loading channels</Text>
                            <ButtonSpinner />
                        </Stack>
                    )}
                </Stack>
            </Stack>
        </CentralPanelLayout>
    )
}

const ChannelItem = ({
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
    const { client, leaveRoom } = useZionClient()
    const channelIdentifier = makeRoomIdentifier(channelNetworkId)

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

    const onClick = useEvent(async () => {
        setSyncingSpace(true)
        if (isJoined) {
            await leaveRoom(channelIdentifier, space.id.networkId)
        } else {
            await client?.joinRoom(channelIdentifier, space.id.networkId)
        }
    })

    return (
        <Stack horizontal justifyContent="spaceBetween">
            <Stack horizontal centerContent gap="sm">
                <Icon type="tag" padding="line" background="level2" size="square_lg" />
                <Text color="gray1">{name}</Text>
            </Stack>

            <Button
                disabled={syncingSpace}
                minWidth="x8"
                size="button_sm"
                rounded="sm"
                hoverEffect="none"
                tone={syncingSpace ? 'level3' : isJoined ? 'level3' : 'cta1'}
                onClick={onClick}
            >
                {syncingSpace ? <ButtonSpinner /> : isJoined ? 'Leave' : 'Join'}
            </Button>
        </Stack>
    )
}
