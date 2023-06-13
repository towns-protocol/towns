import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Channel } from '../types/zion-types'
import { useZionContext } from './ZionContextProvider'
import { useSpaceData } from '../hooks/use-space-data'
import { useAsyncTaskQueue } from '../utils/useAsyncTaskQueue'
import { useZionClient } from '../hooks/use-zion-client'

// When the space changes, join all eligible channels
export const AutojoinChannels = () => {
    const space = useSpaceData()
    const channels = useMemo(() => space?.channelGroups.flatMap((cg) => cg.channels) || [], [space])
    const { client } = useZionContext()
    const { joinRoom } = useZionClient()
    const { enqueueTask, clearQueue } = useAsyncTaskQueue()
    const checkedChannels = useRef<Record<string, boolean>>({})

    const _joinRoom = useCallback(
        (channel: Channel) => {
            return async () => {
                try {
                    await joinRoom(channel.id, space?.id.networkId)
                } catch (error) {
                    console.warn(
                        '[AutoJoinChannels] cannot auto join channel',
                        channel.id.networkId,
                        error,
                    )
                }
            }
        },
        [joinRoom, space?.id.networkId],
    )

    // we want a list of only brand new channels user has never joined before
    const channelsToJoin = useMemo(() => {
        if (!client || !space?.id) {
            return []
        }
        return channels.filter((channel) => {
            // TODO: what does channel.private mean?
            // we create channels w/ PUBLIC visibility by default, but this is always true
            // if (channel.private) {
            //     return
            // }

            // Why not check matrixClient?.getRoom(channel.id.networkId).getMyMembership?
            // Because it always returns null if the user's status is not "join". We have no way of knowing if the user has left the room or not, or if they're banned
            // So we're checking against against our custom record of room memberships
            // anything besides nullish signifies we have a record for this room, and we don't need to worry about auto joining
            return client.getChannelMembershipFromSpace(space?.id, channel.id.networkId) == null
        })
    }, [channels, client, space?.id])

    // watch eligible channels to join
    useEffect(() => {
        channelsToJoin.forEach((channel) => {
            // add to queue a single time
            if (!checkedChannels.current[channel.id.networkId]) {
                checkedChannels.current[channel.id.networkId] = true
                enqueueTask(_joinRoom(channel))
            }
        })
        return () => {
            // this can be optional. we could have a peristent checkedChannels cache and not clear these so that channels are enqueued once and continue running in background even if user changes space
            clearQueue()
            checkedChannels.current = {}
        }
    }, [_joinRoom, enqueueTask, clearQueue, channelsToJoin])

    return null
}
