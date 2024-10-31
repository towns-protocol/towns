import type { SyncAgent, TimelineEvents } from '@river-build/sdk'
import { useCallback } from 'react'
import { useTimeline } from './useTimeline'
import type { ObservableConfig } from './useObservable'

export const useDmTimeline = (
    streamId: string,
    config?: ObservableConfig.FromObservable<TimelineEvents>,
) => {
    const view = useCallback(
        (sync: SyncAgent) => sync.dms.getDm(streamId).timeline.events,
        [streamId],
    )
    return useTimeline(view, config)
}
