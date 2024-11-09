import { type Members } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ObservableConfig, useObservable } from './useObservable'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

export const useMemberList = (
    streamId: string,
    config?: ObservableConfig.FromObservable<Members>,
) => {
    const sync = useSyncAgent()
    const members = useMemo(() => getRoom(sync, streamId).members, [sync, streamId])
    return useObservable(members, config)
}
