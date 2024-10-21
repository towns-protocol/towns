import { useMemo } from 'react'
import type { Gdm } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

export const useGdm = (streamId: string, config?: ObservableConfig.FromObservable<Gdm>) => {
    const sync = useSyncAgent()
    const gdm = useMemo(() => sync.gdms.getGdm(streamId), [streamId, sync])
    return useObservable(gdm, config)
}
