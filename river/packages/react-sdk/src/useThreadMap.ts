import { useMemo } from 'react'
import type { Threads } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

export const useThreadMap = (
    spaceId: string,
    channelId: string,
    config?: ObservableConfig.FromObservable<Threads>,
) => {
    const sync = useSyncAgent()
    const channel = useMemo(
        () => sync.spaces.getSpace(spaceId).getChannel(channelId),
        [sync.spaces, spaceId, channelId],
    )
    return useObservable(channel.timeline.threads, config)
}
