'use client'

import type { Space } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

export const useJoinSpace = (spaceId: string, config: ActionConfig<Space['join']> = {}) => {
    const sync = useSyncAgent()
    const space = sync.spaces.getSpace(spaceId)
    const { action: join, ...rest } = useAction(space, 'join', config)

    return {
        join,
        ...rest,
    }
}
