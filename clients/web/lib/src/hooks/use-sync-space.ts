import { RoomIdentifier } from '../types/room-identifier'
import { removeSyncedEntitledChannelsQueriesForSpace } from '../query/removeSyncedEntitledChannelQueries'
import { useCallback } from 'react'
import { useZionContext } from '../components/ZionContextProvider'

// hook to force sync the space hierarchy
export function useSyncSpace() {
    const { syncSpaceHierarchy } = useZionContext()

    const syncSpace = useCallback(
        (spaceId: RoomIdentifier) => {
            console.log('[useSyncSpace] sync requested for spaceId', spaceId.networkId)
            removeSyncedEntitledChannelsQueriesForSpace(spaceId.networkId) // remove cached entries
            syncSpaceHierarchy(spaceId.networkId) // sync the space hierarchy
        },
        [syncSpaceHierarchy],
    )

    return {
        syncSpace,
    }
}
