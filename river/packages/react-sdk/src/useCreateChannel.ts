'use client'

import type { Space } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

export const useCreateChannel = (
    spaceId: string,
    config?: ActionConfig<Space['createChannel']>,
) => {
    const sync = useSyncAgent()
    const space = useMemo(() => sync.spaces.getSpace(spaceId), [spaceId, sync.spaces])
    const { action: createChannel, ...rest } = useAction(space, 'createChannel', config)

    return {
        createChannel,
        ...rest,
    }
}
