'use client'
import type { SyncAgent } from '@river-build/sdk'
import { useEffect, useState } from 'react'
import { RiverSyncContext } from './internals/RiverSyncContext'

type RiverSyncProviderProps = {
    syncAgent?: SyncAgent
    children?: React.ReactNode
}

export const RiverSyncProvider = (props: RiverSyncProviderProps) => {
    const [syncAgent, setSyncAgent] = useState(() => props.syncAgent)

    useEffect(() => {
        setSyncAgent(props.syncAgent)
    }, [props.syncAgent])

    useEffect(() => {
        if (syncAgent) {
            syncAgent.start()
        }
        return () => {
            if (syncAgent) {
                syncAgent.stop()
            }
        }
    }, [syncAgent])

    return (
        <RiverSyncContext.Provider
            value={{
                syncAgent,
                setSyncAgent,
            }}
        >
            {props.children}
        </RiverSyncContext.Provider>
    )
}
