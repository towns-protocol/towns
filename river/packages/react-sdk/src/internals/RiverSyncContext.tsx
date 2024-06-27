'use client'
import { SyncAgent } from '@river-build/sdk'
import { createContext } from 'react'

type RiverSyncContextType = {
    syncAgent: SyncAgent | undefined
    setSyncAgent: (syncAgent: SyncAgent | undefined) => void
}
export const RiverSyncContext = createContext<RiverSyncContextType | undefined>(undefined)
