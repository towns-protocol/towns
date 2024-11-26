'use client'
import { useRiverSync } from './internals/useRiverSync'

/**
 * Hook to get the sync agent from the RiverSyncProvider.
 *
 * You can use it to interact with the sync agent for more advanced usage.
 *
 * Throws an error if no sync agent is set in the RiverSyncProvider.
 *
 * @returns The sync agent in use, set in RiverSyncProvider.
 * @throws If no sync agent is set, use RiverSyncProvider to set one or use useAgentConnection to check if connected.
 */
export const useSyncAgent = () => {
    const river = useRiverSync()

    if (!river?.syncAgent) {
        throw new Error(
            'No SyncAgent set, use RiverSyncProvider to set one or use useAgentConnection to check if connected',
        )
    }

    return river.syncAgent
}
