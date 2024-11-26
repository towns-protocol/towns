'use client'
import type { Observable, SyncAgent } from '@river-build/sdk'
import { type ObservableConfig, useObservable } from './useObservable'
import { useSyncAgent } from './useSyncAgent'

type SyncSelector = SyncAgent['observables']

/**
 * Hook to get an observable from the sync agent.
 *
 * An alternative of our premade hooks, allowing the creation of custom abstractions.
 * @param selector - A selector function to get a observable from the sync agent.
 * @param config - Configuration options for the observable.
 * @returns The data from the selected observable.
 */
export function useRiver<T>(
    selector: (sync: SyncSelector) => Observable<T>,
    config?: ObservableConfig.FromData<T>,
) {
    const syncAgent = useSyncAgent()
    return useObservable(selector(syncAgent.observables), config)
}
