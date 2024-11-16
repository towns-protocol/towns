'use client'

import { useMemo } from 'react'
import type { Space } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

/**
 * Hook to get data about a space.
 * You can use this hook to get space metadata and ids of channels in the space.
 * @param spaceId - The id of the space to get data about.
 * @param config - Configuration options for the observable. @see {@link ObservableConfig.FromObservable}
 * @returns The {@link SpaceModel} data.
 */
export const useSpace = (spaceId: string, config?: ObservableConfig.FromObservable<Space>) => {
    const sync = useSyncAgent()
    const observable = useMemo(() => sync.spaces.getSpace(spaceId), [sync, spaceId])
    return useObservable(observable, config)
}
