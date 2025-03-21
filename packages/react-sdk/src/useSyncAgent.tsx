'use client'
import { useTownsSync } from './internals/useTownsSync'

/**
 * Hook to get the sync agent from the TownsSyncProvider.
 *
 * You can use it to interact with the sync agent for more advanced usage.
 *
 * Throws an error if no sync agent is set in the TownsSyncProvider.
 *
 * @returns The sync agent in use, set in TownsSyncProvider.
 * @throws If no sync agent is set, use TownsSyncProvider to set one or use useAgentConnection to check if connected.
 */
export const useSyncAgent = () => {
    const towns = useTownsSync()

    if (!towns?.syncAgent) {
        throw new Error(
            'No SyncAgent set, use TownsSyncProvider to set one or use useAgentConnection to check if connected',
        )
    }

    return towns.syncAgent
}
