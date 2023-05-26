import { QuerySyncKey } from '../hooks/query-keys'
import { queryClient } from './queryClient'

// query will only be scoped to a space, not a channel, but it's simpler to just clear them all and let them be refetched when necessary b/c
// - actions that require this query to be removed should be rare - joining a room, updating a channel, etc
// - more reliable for situations that can occur in tests
export function removeSyncedEntitleChannelsQueries() {
    queryClient.removeQueries({
        queryKey: [QuerySyncKey.SyncEntitledChannels],
    })
}
