'use client'

import type { Spaces } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

export const useCreateSpace = (config: ActionConfig<Spaces['createSpace']> = {}) => {
    const sync = useSyncAgent()
    const { action: createSpace, ...rest } = useAction(sync.spaces, 'createSpace', config)

    return {
        createSpace,
        ...rest,
    }
}
