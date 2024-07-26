'use client'

import { useMemo } from 'react'
import { useSyncAgent } from './useSyncAgent'
import { useObservable } from './useObservable'

export const useSpace = (spaceId: string) => {
    const sync = useSyncAgent()
    const observable = useMemo(() => sync.spaces.getSpace(spaceId), [sync, spaceId])
    return useObservable(observable)
}
