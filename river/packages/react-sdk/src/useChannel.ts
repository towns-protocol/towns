'use client'

import { useMemo } from 'react'
import type { Channel } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

/**
 *  Views a channel by its channelId and spaceId.
 */
export const useChannel = (
    spaceId: string,
    channelId: string,
    config?: ObservableConfig.FromObservable<Channel>,
) => {
    const sync = useSyncAgent()
    const channel = useMemo(
        () => sync.spaces.getSpace(spaceId).getChannel(channelId),
        [sync.spaces, spaceId, channelId],
    )
    return useObservable(channel, config)
}
