import { type ReactionsMap, Space, assert } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'
import { getRoom } from './utils'

/**
 * Hook to get the reactions of a specific stream.
 * @param streamId - The id of the stream to get the reactions of.
 * @param config - Configuration options for the observable.
 * @returns The reactions of the stream as a map from the message eventId to the reaction.
 */
export const useReactions = (
    streamId: string,
    config?: ObservableConfig.FromData<ReactionsMap>,
) => {
    const sync = useSyncAgent()
    const room = getRoom(sync, streamId)
    assert(!(room instanceof Space), 'Space does not have reactions')

    return useObservable(room.timeline.reactions, config)
}
