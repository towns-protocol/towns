'use client'

import { useMemo } from 'react'
import type { Channel } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ObservableConfig, useObservable } from './useObservable'

/**
 * Hook to get data about a channel.
 * You can use this hook to get channel metadata and if the user has joined the channel.
 * @param spaceId - The id of the space the channel belongs to.
 * @param channelId - The id of the channel to get data about.
 * @param config - Configuration options for the observable. @see {@link ObservableConfig.FromObservable}
 * @returns The {@link ChannelModel} data.
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
