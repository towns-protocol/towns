import type { SyncAgent, TimelineEvents } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

export const useTimeline = (
    timeline: (sync: SyncAgent) => TimelineEvents,
    config?: ObservableConfig.FromObservable<TimelineEvents>,
) => {
    const sync = useSyncAgent()
    return useObservable(timeline(sync), config)
}
