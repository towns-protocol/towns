import { useMemo } from 'react'
import type { TimelineEvents } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

export const useTimeline = (
    spaceId: string,
    channelId: string,
    config?: ObservableConfig.FromObservable<TimelineEvents>,
) => {
    const sync = useSyncAgent()
    const channel = useMemo(
        () => sync.spaces.getSpace(spaceId).getChannel(channelId),
        [sync.spaces, spaceId, channelId],
    )
    return useObservable(channel.timeline.events, config)
}
