'use client'

import type { Dms } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

/**
 * A hook that allows you to create a new direct message (DM).
 * @param config - The action config.
 * @returns An object containing the `createDM` action and the rest of the action result.
 */
export const useCreateDm = (config?: ActionConfig<Dms['createDM']>) => {
    const sync = useSyncAgent()
    const { action: createDM, ...rest } = useAction(sync.dms, 'createDM', config)

    return {
        /**
         * Creates a new DM.
         * @param userId - The River `userId` of the user to create a DM with.
         * @returns A promise that resolves to the result of the create operation.
         */
        createDM,
        ...rest,
    }
}
