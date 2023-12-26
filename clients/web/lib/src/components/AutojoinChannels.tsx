import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Channel } from '../types/zion-types'
import { useZionContext } from './ZionContextProvider'
import { useSpaceData } from '../hooks/use-space-data'
import { useAsyncTaskQueue } from '../utils/useAsyncTaskQueue'
import { useZionClient } from '../hooks/use-zion-client'

// When loading a space, join all eligible channels
export const AutojoinChannels = () => {
    const space = useSpaceData()
    const channels = useMemo(() => space?.channelGroups.flatMap((cg) => cg.channels) || [], [space])
    const { casablancaClient } = useZionContext()
    const { joinRoom } = useZionClient()
    const { enqueueTask } = useAsyncTaskQueue()
    const checkedChannels = useRef<Record<string, boolean>>({})
    const userId = casablancaClient?.userId
    const [channelsToJoin, setChannelsToJoin] = useState<Channel[]>([])

    const _joinRoom = useCallback(
        (channel: Channel) => {
            return async () => {
                try {
                    await joinRoom(channel.id, space?.id)
                } catch (error) {
                    console.error('[AutoJoinChannels] joining channel failed', channel.id, error)
                }
            }
        },
        [joinRoom, space?.id],
    )

    useEffect(() => {
        async function update() {
            if (!userId) {
                return
            }
            // channels that are not joined and have no history of leaving
            const _channelsToJoin = await asyncFilter(channels, async (c) => {
                try {
                    const streamStateView = await casablancaClient.getStream(c.id)
                    return streamStateView
                        ? !streamStateView.getMemberships().leftUsers.has(userId)
                        : false
                } catch (error) {
                    console.error('[AutoJoinChannels] fetching stream failed', c.id, error)
                }
                return false
            })
            setChannelsToJoin(_channelsToJoin)
        }

        void update()
    }, [casablancaClient, channels, userId])

    // watch eligible channels to join
    useEffect(() => {
        channelsToJoin.forEach((channel) => {
            // add to queue a single time. let them run in background, even if user navigates away
            if (!checkedChannels.current[channel.id]) {
                checkedChannels.current[channel.id] = true
                enqueueTask(_joinRoom(channel))
            }
        })
    }, [_joinRoom, enqueueTask, channelsToJoin])

    return null
}

async function asyncFilter<T>(arr: T[], predicate: (item: T) => Promise<boolean>): Promise<T[]> {
    const results = await Promise.all(arr.map(predicate))
    return arr.filter((_v, index) => results[index])
}
