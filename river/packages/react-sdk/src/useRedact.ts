'use client'

import { type Channel, Space, assert } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

export const useRedact = (streamId: string, config?: ActionConfig<Channel['redactEvent']>) => {
    const sync = useSyncAgent()
    const room = getRoom(sync, streamId)
    assert(!(room instanceof Space), 'Space does not have reactions')
    const { action: redactEvent, ...rest } = useAction(room, 'redactEvent', config)

    return {
        redactEvent,
        ...rest,
    }
}
