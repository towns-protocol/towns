'use client'
import type { Observable, SyncAgent } from '@river-build/sdk'
import { type ObservableConfig, useObservable } from './useObservable'
import { useSyncAgent } from './useSyncAgent'

type SyncLens = SyncAgent['observables']

export function useRiver<T>(fn: (sync: SyncLens) => Observable<T>, config?: ObservableConfig<T>) {
    const syncAgent = useSyncAgent()
    return useObservable(fn(syncAgent.observables), config)
}
