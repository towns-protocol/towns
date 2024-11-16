'use client'

import type { Spaces } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

/**
 * Hook to create a space.
 * @param config - Configuration options for the action. @see {@link ActionConfig}
 * @returns The `createSpace` action and its loading state.
 */
export const useCreateSpace = (config: ActionConfig<Spaces['createSpace']> = {}) => {
    const sync = useSyncAgent()
    const { action: createSpace, ...rest } = useAction(sync.spaces, 'createSpace', config)

    return {
        /**
         * Action to create a space.
         * @param opts - Options for the create space action.
         * @param signer - The signer used to create the space.
         */
        createSpace,
        ...rest,
    }
}
