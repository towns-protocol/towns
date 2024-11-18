'use client'

import type { Gdms } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

/**
 * A hook that allows you to create a new group direct message (GDM).
 * @param config - The action config.
 * @returns An object containing the `createGDM` action and the rest of the action result.
 */
export const useCreateGdm = (config?: ActionConfig<Gdms['createGDM']>) => {
    const sync = useSyncAgent()
    const { action: createGDM, ...rest } = useAction(sync.gdms, 'createGDM', config)

    return {
        /**
         * Creates a new GDM.
         * @param userIds - The River `userIds` of the users to invite to the GDM.
         * @returns A promise that resolves to the result of the create operation.
         */
        createGDM,
        ...rest,
    }
}
