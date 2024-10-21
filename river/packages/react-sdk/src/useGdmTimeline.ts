import type { SyncAgent, TimelineEvents } from '@river-build/sdk'
import { useCallback } from 'react'
import { useTimeline } from './useTimeline'
import type { ObservableConfig } from './useObservable'

export const useGdmTimeline = (
    streamId: string,
    config?: ObservableConfig.FromObservable<TimelineEvents>,
) => {
    const view = useCallback(
        (sync: SyncAgent) => sync.gdms.getGdm(streamId).timeline.events,
        [streamId],
    )
    return useTimeline(view, config)
}
