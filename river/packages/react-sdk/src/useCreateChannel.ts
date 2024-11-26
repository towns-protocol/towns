'use client'

import type { Space } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

/**
 * Hook to create a channel.
 * @param config - Configuration options for the action.
 * @returns The `createChannel` action and its loading state.
 */
export const useCreateChannel = (
    spaceId: string,
    config?: ActionConfig<Space['createChannel']>,
) => {
    const sync = useSyncAgent()
    const space = useMemo(() => sync.spaces.getSpace(spaceId), [spaceId, sync.spaces])
    const { action: createChannel, ...rest } = useAction(space, 'createChannel', config)

    return {
        /**
         * Action to create a channel.
         * @param name - The name of the channel to create.
         * @param signer - The signer to use to create the channel.
         */
        createChannel,
        ...rest,
    }
}
