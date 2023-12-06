import { useCallback, useEffect, useMemo, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { Channel, Membership, SpaceData } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import isEqual from 'lodash/isEqual'

export function useMyChannels(space?: SpaceData) {
    const channelIds = useMemo(() => {
        return (
            space?.channelGroups.flatMap((group) => group.channels.map((channel) => channel.id)) ??
            []
        )
    }, [space?.channelGroups])

    const casablancaChannelIds = useMyMembershipsCasablanca(channelIds)

    const filterUnjoinedChannels = useCallback(
        (channels: Channel[]) => {
            return channels.filter((channel) => {
                return casablancaChannelIds.has(channel.id.networkId)
            })
        },
        [casablancaChannelIds],
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
