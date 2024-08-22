'use client'

import type { Spaces } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

export const useJoinSpace = (config?: ActionConfig<Spaces['joinSpace']>) => {
    const sync = useSyncAgent()
    const { action: joinSpace, ...rest } = useAction(sync.spaces, 'joinSpace', config)

    return {
        joinSpace,
        ...rest,
    }
}
