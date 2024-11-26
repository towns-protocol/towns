import { useMemo } from 'react'
import { Space, type Threads, assert } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'
import { getRoom } from './utils'

/**
 * Hook to get the threads from a stream.
 *
 * @param streamId - The id of the stream to get the threads from.
 * @param config - Configuration options for the observable.
 * @returns The threads of the stream as a map from the message eventId to a thread.
 */
export const useThreads = (streamId: string, config?: ObservableConfig.FromObservable<Threads>) => {
    const sync = useSyncAgent()
    const room = useMemo(() => getRoom(sync, streamId), [streamId, sync])
    assert(!(room instanceof Space), 'room cant be a space')
    return useObservable(room.timeline.threads, config)
}
