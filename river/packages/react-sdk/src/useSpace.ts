'use client'

import { useMemo } from 'react'
import type { Space } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

export const useSpace = (spaceId: string, config?: ObservableConfig.FromObservable<Space>) => {
    const sync = useSyncAgent()
    const observable = useMemo(() => sync.spaces.getSpace(spaceId), [sync, spaceId])
    return useObservable(observable, config)
}
