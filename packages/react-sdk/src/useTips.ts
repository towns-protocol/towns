import { Space, type TipsMap, assert } from '@towns-protocol/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'
import { getRoom } from './utils'
/**
 * Hook to get the tips of a specific stream.
 * @param streamId - The id of the stream to get the tips of.
 * @param config - Configuration options for the observable.
 * @returns The tips of the stream as a map from the message eventId to the tip.
 */
export const useTips = (streamId: string, config?: ObservableConfig.FromData<TipsMap>) => {
    const sync = useSyncAgent()
    const room = getRoom(sync, streamId)
    assert(!(room instanceof Space), 'Space does not have tips')

    return useObservable(room.timeline.tips, config)
}
