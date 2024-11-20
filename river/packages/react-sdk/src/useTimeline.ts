import { Space, type TimelineEvents, assert } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ObservableConfig, useObservable } from './useObservable'
import { getRoom } from './utils'
import { useSyncAgent } from './useSyncAgent'

export const useTimeline = (
    streamId: string,
    config?: ObservableConfig.FromObservable<TimelineEvents>,
) => {
    const sync = useSyncAgent()
    const room = useMemo(() => getRoom(sync, streamId), [streamId, sync])
    assert(!(room instanceof Space), 'Space does not have timeline')
    return useObservable(room.timeline.events, config)
}
