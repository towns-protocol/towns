import { Space, type TimelineEvents, assert } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ObservableConfig, useObservable } from './useObservable'
import { getRoom } from './utils'
import { useSyncAgent } from './useSyncAgent'

/**
 * Hook to get the timeline events from a stream.
 *
 * You can use the `useTimeline` hook to get the timeline events from a channel stream, dm stream or group dm stream
 *
 * @example
 * ```ts
 * import { useTimeline } from '@river-build/react-sdk'
 * import { RiverTimelineEvent } from '@river-build/sdk'
 *
 * const { data: events } = useTimeline(streamId)
 *
 * // You can filter the events by their kind
 * const messages = events.filter((event) => event.content?.kind === RiverTimelineEvent.ChannelMessage)
 * ```
 *
 * @param streamId - The id of the stream to get the timeline events from.
 * @param config - Configuration options for the observable.
 * @returns The timeline events of the stream as an observable.
 */
export const useTimeline = (
    streamId: string,
    config?: ObservableConfig.FromObservable<TimelineEvents>,
) => {
    const sync = useSyncAgent()
    const room = useMemo(() => getRoom(sync, streamId), [streamId, sync])
    assert(!(room instanceof Space), 'Space does not have timeline')
    return useObservable(room.timeline.events, config)
}
