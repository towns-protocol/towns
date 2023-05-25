import { RoomIdentifier } from '../types/room-identifier'
import { removeSyncedEntitleChannelsQueries } from '../query/removeSyncedEntitledChannelQueries'
import { useCallback } from 'react'
import { useZionContext } from '../components/ZionContextProvider'

// hook to force sync the space hierarchy
export function useSyncSpace() {
    const { syncSpaceHierarchy } = useZionContext()

    const syncSpace = useCallback(
        (spaceId: RoomIdentifier) => {
            removeSyncedEntitleChannelsQueries() // remove cached entries
            syncSpaceHierarchy(spaceId) // sync the space hierarchy
        },
        [syncSpaceHierarchy],
    )

    return {
        syncSpace,
    }
}
