import { useMemo } from 'react'
import type { Dm } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

export const useDm = (streamId: string, config?: ObservableConfig.FromObservable<Dm>) => {
    const sync = useSyncAgent()
    const dm = useMemo(() => sync.dms.getDm(streamId), [streamId, sync])
    return useObservable(dm, config)
}
