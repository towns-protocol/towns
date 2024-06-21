import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { Channel, SpaceData } from '../types/towns-types'
import isEqual from 'lodash/isEqual'
import { isUserStreamId, streamIdAsString } from '@river-build/sdk'
import { MembershipOp } from '@river-build/proto'
import { useCasablancaStream } from './CasablancClient/useCasablancaStream'

export function useMyChannels(space?: SpaceData) {
    const casablancaChannelIds = useMyMembershipsCasablanca()

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

function useMyMembershipsCasablanca() {
    const { casablancaClient } = useTownsContext()
    const [myMemberships, setMyMemberships] = useState<Set<string>>(new Set())
    const userStream = useCasablancaStream(casablancaClient?.userStreamId)

    useEffect(() => {
        if (!casablancaClient || !userStream) {
            return
        }

        const updateState = () => {
            if (!userStream) {
                return
            }
            const memberships = new Set(
                Object.values(userStream.view.userContent.streamMemberships)
                    .filter((membership) => membership.op === MembershipOp.SO_JOIN)
                    .map((membership) => streamIdAsString(membership.streamId)),
            )
            setMyMemberships((prev) => {
                if (isEqual(prev, memberships)) {
                    return prev
                }
                return memberships
            })
        }

        const onUserStreamMembershipChanged = (_streamId: string) => {
            updateState()
        }

        const onStreamInitialized = (streamId: string) => {
            if (isUserStreamId(streamId)) {
                updateState()
            }
        }

        updateState()

        casablancaClient.on('userStreamMembershipChanged', onUserStreamMembershipChanged)
        casablancaClient.on('streamInitialized', onStreamInitialized)

        return () => {
            casablancaClient.off('userStreamMembershipChanged', onUserStreamMembershipChanged)
            casablancaClient.off('streamInitialized', onStreamInitialized)
        }
    }, [casablancaClient, userStream])

    return myMemberships
}
