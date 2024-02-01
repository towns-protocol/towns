import { useCallback, useEffect, useMemo, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { Channel, SpaceData } from '../types/zion-types'
import isEqual from 'lodash/isEqual'
import { isChannelStreamId, isSpaceStreamId } from '@river/sdk'
import { MembershipOp } from '@river/proto'

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
                return casablancaChannelIds.has(channel.id)
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

function useMyMembershipsCasablanca(channelIds: string[]) {
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

        if (!casablancaClient || !casablancaClient.userStreamId) {
            return
        }
        const userStream = casablancaClient.streams.get(casablancaClient.userStreamId)
        if (!userStream) {
            return
        }

        const inChannelIdSet = new Set(channelIds.map((channelId) => channelId))
        const updateState = () => {
            const memberships = new Set(
                channelIds
                    .filter((channelId) => {
                        try {
                            return userStream.view.userContent.isMember(
                                channelId,
                                MembershipOp.SO_JOIN,
                            )
                        } catch (error) {
                            return false
                        }
                    })
                    .map((channelId) => channelId),
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

        const onStreamInitialized = (streamId: string) => {
            if (isSpaceStreamId(streamId) || isChannelStreamId(streamId)) {
                updateState()
            }
        }

        updateState()

        casablancaClient.on('streamNewUserJoined', onStreamUserMembership)
        casablancaClient.on('streamUserLeft', onStreamUserMembership)
        casablancaClient.on('streamInitialized', onStreamInitialized)

        return () => {
            casablancaClient.off('streamNewUserJoined', onStreamUserMembership)
            casablancaClient.off('streamUserLeft', onStreamUserMembership)
            casablancaClient.off('streamInitialized', onStreamInitialized)
        }
    }, [channelIds, client, casablancaClient])

    return isMemberOf
}
