'use client'
import { useRiverSync } from './internals/useRiverSync'

export const useSyncAgent = () => {
    const river = useRiverSync()

    if (!river?.syncAgent) {
        console.error(
            'No SyncAgent set, use RiverSyncProvider to set one or use useConnected to check if connected',
        )
        return undefined
    }

    return river.syncAgent
}
