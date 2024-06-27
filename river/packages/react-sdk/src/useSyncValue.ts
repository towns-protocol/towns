'use client'
import type { Observable, SyncAgent } from '@river-build/sdk'
import { type ObservableConfig, useObservable } from './useObservable'
import { useSyncAgent } from './useSyncAgent'

type SyncLens = SyncAgent['observables']

// TODO: maybe we should call this useRiver?
export function useSyncValue<T>(
    fn: (sync: SyncLens) => Observable<T>,
    config?: ObservableConfig<T>,
) {
    const syncAgent = useSyncAgent()
    return useObservable(syncAgent ? fn(syncAgent.observables) : undefined, config)
}
