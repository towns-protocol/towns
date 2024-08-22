'use client'

import type { Channel } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

export const useReaction = (
    spaceId: string,
    channelId: string,
    config?: ActionConfig<Channel['sendReaction']>,
) => {
    const sync = useSyncAgent()
    const channel = useMemo(
        () => sync.spaces.getSpace(spaceId).getChannel(channelId),
        [sync.spaces, spaceId, channelId],
    )
    const { action: sendReaction, ...rest } = useAction(channel, 'sendReaction', config)

    return {
        sendReaction,
        ...rest,
    }
}
