import type { SyncAgent, TimelineEvents } from '@river-build/sdk'
import { useCallback } from 'react'
import { useTimeline } from './useTimeline'
import type { ObservableConfig } from './useObservable'

export const useChannelTimeline = (
    spaceId: string,
    channelId: string,
    config?: ObservableConfig.FromObservable<TimelineEvents>,
) => {
    const view = useCallback(
        (sync: SyncAgent) => sync.spaces.getSpace(spaceId).getChannel(channelId).timeline.events,
        [spaceId, channelId],
    )
    return useTimeline(view, config)
}
