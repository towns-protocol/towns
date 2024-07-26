import { useMemo } from 'react'
import { useSyncAgent } from './useSyncAgent'
import { useObservable } from './useObservable'

export const useTimeline = (spaceId: string, channelId: string) => {
    const sync = useSyncAgent()
    const channel = useMemo(
        () => sync.spaces.getSpace(spaceId).getChannel(channelId),
        [sync.spaces, spaceId, channelId],
    )
    return useObservable(channel.timeline.events)
}
