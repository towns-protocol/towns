import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useZionContext } from './ZionContextProvider'
import { useSpaceData } from '../hooks/use-space-data'
import { useAsyncTaskQueue } from '../utils/useAsyncTaskQueue'
import { useZionClient } from '../hooks/use-zion-client'
import { MembershipOp } from '@river/proto'
import { MembershipReason } from '@river/proto'

// When loading a space, join all eligible channels
export const AutojoinChannels = () => {
    const space = useSpaceData()
    const channels = useMemo(() => space?.channelGroups.flatMap((cg) => cg.channels) || [], [space])
    const { casablancaClient } = useZionContext()
    const { joinRoom } = useZionClient()
    const { enqueueTask } = useAsyncTaskQueue()
    const checkedChannels = useRef<Record<string, boolean>>({})
    const [streamIdsToJoin, setStreamIdsToJoin] = useState<string[]>([])

    const _joinStream = useCallback(
        (streamId: string) => {
            return async () => {
                try {
                    await joinRoom(streamId, undefined)
                } catch (error) {
                    console.error('[AutoJoinChannels] joining channel failed', streamId, error)
                }
            }
        },
        [joinRoom],
    )

    // we still need to handle the case where a user leaves a space, and automatically leaves
    // all the channels. HNT-4431
    useEffect(() => {
        if (!casablancaClient || !casablancaClient.userStreamId) {
            return
        }
        const userStream = casablancaClient.streams.get(casablancaClient.userStreamId)
        if (!userStream) {
            return
        }

        const streamsToJoin = channels
            .map((c) => c.id)
            .filter((streamId) => {
                const membership = userStream.view.userContent.streamMemberships[streamId]
                if (membership?.op === MembershipOp.SO_JOIN) {
                    return false
                }
                if (
                    membership?.op === MembershipOp.SO_LEAVE &&
                    membership.reason !== MembershipReason.MR_LEFT_SPACE
                ) {
                    return false
                }
                return true
            })

        setStreamIdsToJoin(streamsToJoin)
    }, [casablancaClient, channels, casablancaClient?.userStreamId])

    // watch eligible channels to join
    useEffect(() => {
        streamIdsToJoin.forEach((streamId) => {
            // add to queue a single time. let them run in background, even if user navigates away
            if (!checkedChannels.current[streamId]) {
                checkedChannels.current[streamId] = true
                enqueueTask(_joinStream(streamId))
            }
        })
    }, [_joinStream, enqueueTask, streamIdsToJoin])

    return null
}
