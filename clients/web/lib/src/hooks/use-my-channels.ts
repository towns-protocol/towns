import { useCallback, useEffect, useMemo, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { Channel, Membership, SpaceData } from '../types/zion-types'
import {
    MatrixEvent,
    RoomMember as MatrixRoomMember,
    RoomMemberEvent,
    RoomState,
    RoomStateEvent,
} from 'matrix-js-sdk'
import { RoomIdentifier } from '../types/room-identifier'
import isEqual from 'lodash/isEqual'

export function useMyChannels(space?: SpaceData) {
    const channelIds = useMemo(() => {
        return (
            space?.channelGroups.flatMap((group) => group.channels.map((channel) => channel.id)) ??
            []
        )
    }, [space?.channelGroups])

    const matrixChannelIds = useMyMembershipsMatrix(channelIds)
    const casablancaChannelIds = useMyMembershipsCasablanca(channelIds)

    const filterUnjoinedChannels = useCallback(
        (channels: Channel[]) => {
            return channels.filter((channel) => {
                return (
                    matrixChannelIds.has(channel.id.networkId) ||
                    casablancaChannelIds.has(channel.id.networkId)
                )
            })
        },
        [casablancaChannelIds, matrixChannelIds],
    )

    const channelGroups = useMemo(() => {
        return (
            space?.channelGroups.map((group) => {
                return {
                    ...group,
                    channels: filterUnjoinedChannels(group.channels),
                }
            }) ?? []
        )
    }, [filterUnjoinedChannels, space?.channelGroups])

    return channelGroups
}

function useMyMembershipsMatrix(channelIds: RoomIdentifier[]) {
    const { matrixClient, client } = useZionContext()
    const [isMemberOf, setIsMemberOf] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!matrixClient || !client) {
            return
        }
        const userId = matrixClient.getUserId()
        if (!userId) {
            return
        }
        const inChannelIdSet = new Set(channelIds.map((channelId) => channelId.networkId))
        const updateState = () => {
            const memberships = new Set(
                channelIds
                    .filter((channelId) => {
                        try {
                            const roomData = client?.getRoomData(channelId)
                            return roomData?.membership === Membership.Join
                        } catch (error) {
                            return false
                        }
                    })
                    .map((channelId) => channelId.networkId),
            )
            setIsMemberOf((prev) => {
                if (isEqual(prev, memberships)) {
                    return prev
                }
                return memberships
            })
        }

        const onMembersUpdated = (
            event: MatrixEvent,
            roomState: RoomState,
            member: MatrixRoomMember,
        ) => {
            if (member.userId === userId && inChannelIdSet.has(event.getRoomId() ?? '')) {
                updateState()
            }
        }

        const onRoomMembership = (
            event: MatrixEvent,
            member: MatrixRoomMember,
            _oldMembership?: string | null,
        ) => {
            if (member.userId === userId && inChannelIdSet.has(event.getRoomId() ?? '')) {
                updateState()
            }
        }

        updateState()
        matrixClient.on(RoomMemberEvent.Membership, onRoomMembership)
        matrixClient.on(RoomStateEvent.NewMember, onMembersUpdated)

        return () => {
            matrixClient.off(RoomMemberEvent.Membership, onRoomMembership)
            matrixClient.off(RoomStateEvent.NewMember, onMembersUpdated)
        }
    }, [channelIds, client, matrixClient])

    return isMemberOf
}

function useMyMembershipsCasablanca(channelIds: RoomIdentifier[]) {
    const { casablancaClient, client } = useZionContext()
    const [isMemberOf, setIsMemberOf] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!casablancaClient || !client) {
            return
        }
        const userId = casablancaClient.userId
        if (!userId) {
            return
        }
        const inChannelIdSet = new Set(channelIds.map((channelId) => channelId.networkId))
        const updateState = () => {
            const memberships = new Set(
                channelIds
                    .filter((channelId) => {
                        try {
                            const roomData = client?.getRoomData(channelId)
                            return roomData?.membership === Membership.Join
                        } catch (error) {
                            return false
                        }
                    })
                    .map((channelId) => channelId.networkId),
            )
            setIsMemberOf((prev) => {
                if (isEqual(prev, memberships)) {
                    return prev
                }
                return memberships
            })
        }

        const onStreamUserMembership = (streamId: string, oUserId: string) => {
            if (oUserId === userId && inChannelIdSet.has(streamId)) {
                updateState()
            }
        }

        updateState()

        casablancaClient.on('streamNewUserJoined', onStreamUserMembership)
        casablancaClient.on('streamUserLeft', onStreamUserMembership)

        return () => {
            casablancaClient.off('streamNewUserJoined', onStreamUserMembership)
            casablancaClient.off('streamUserLeft', onStreamUserMembership)
        }
    }, [channelIds, client, casablancaClient])

    return isMemberOf
}
