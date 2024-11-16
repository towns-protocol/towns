'use client'

import type { Spaces } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

/**
 * Hook to join a space.
 * @param config - Configuration options for the action.
 * @returns The joinSpace action and the status of the action.
 */
export const useJoinSpace = (config?: ActionConfig<Spaces['joinSpace']>) => {
    const sync = useSyncAgent()
    const { action: joinSpace, ...rest } = useAction(sync.spaces, 'joinSpace', config)

    return {
        /**
         * Action to join a space.
         * @param spaceId - The id of the space to join.
         * @param signer - The signer to use to join the space.
         * @param opts - Options for the join action.
         */
        joinSpace,
        ...rest,
    }
}
