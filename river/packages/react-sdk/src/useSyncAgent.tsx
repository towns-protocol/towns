'use client'
import { useRiverSync } from './internals/useRiverSync'

export const useSyncAgent = () => {
    const river = useRiverSync()

    if (!river?.syncAgent) {
        throw new Error(
            'No SyncAgent set, use RiverSyncProvider to set one or use useAgentConnection to check if connected',
        )
    }

    return river.syncAgent
}
