import { useCallback, useEffect, useMemo, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { Channel, SpaceData } from '../types/zion-types'
import isEqual from 'lodash/isEqual'
import { isUserStreamId } from '@river/sdk'
import { MembershipOp } from '@river/proto'
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
    const { casablancaClient } = useZionContext()
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
                    .map((membership) => membership.streamId),
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
