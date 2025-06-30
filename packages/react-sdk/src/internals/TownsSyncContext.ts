'use client'
import { SyncAgent } from '@towns-protocol/sdk'
import { createContext } from 'react'

type TownsSyncContextProps = {
    syncAgent: SyncAgent | undefined
    setSyncAgent: (syncAgent: SyncAgent | undefined) => void
    config?: {
        onTokenExpired?: () => void
    }
}
export const TownsSyncContext = createContext<
    TownsSyncContextProps | undefined
>(undefined)
