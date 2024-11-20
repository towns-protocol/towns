import { useMemo } from 'react'
import type { GdmModel } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

/**
 * Hook to get the data of a Group DM.
 * You can use this hook to get Group DM metadata and if the user has joined the Group DM.
 * @param streamId - The id of the Group DM to get the data of.
 * @param config - Configuration options for the observable.
 * @returns The GdmModel of the Group DM.
 */
export const useGdm = (streamId: string, config?: ObservableConfig.FromData<GdmModel>) => {
    const sync = useSyncAgent()
    const gdm = useMemo(() => sync.gdms.getGdm(streamId), [streamId, sync])
    return useObservable(gdm, config)
}
