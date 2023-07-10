import { blockchainKeys } from './query-keys'
import { queryClient } from './queryClient'

// clear the query for the entitled channels for a space so that when a space syncs, it will refetch the on chain channels
// - actions that require this query to be removed should be rare - joining a room, updating a channel, etc
export function removeSyncedEntitledChannelsQueriesForSpace(spaceId: string) {
    const state = queryClient.getQueryState(blockchainKeys.entitledChannels(spaceId))
    if (!state?.fetchStatus || state?.fetchStatus === 'idle') {
        queryClient.removeQueries({
            queryKey: blockchainKeys.entitledChannels(spaceId),
        })
    }
}
