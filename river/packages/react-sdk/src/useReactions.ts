import { type ReactionsMap, Space, assert } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'
import { getRoom } from './utils'

export const useReactions = (
    streamId: string,
    config?: ObservableConfig.FromData<ReactionsMap>,
) => {
    const sync = useSyncAgent()
    const room = getRoom(sync, streamId)
    assert(!(room instanceof Space), 'Space does not have reactions')

    return useObservable(room.timeline.reactions, config)
}
