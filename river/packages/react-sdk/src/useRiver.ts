'use client'
import type { Observable, SyncAgent } from '@river-build/sdk'
import { type ObservableConfig, useObservable } from './useObservable'
import { useSyncAgent } from './useSyncAgent'

type SyncSelector = SyncAgent['observables']

export function useRiver<T>(
    selector: (sync: SyncSelector) => Observable<T>,
    config?: ObservableConfig.FromData<T>,
) {
    const syncAgent = useSyncAgent()
    return useObservable(selector(syncAgent.observables), config)
}
