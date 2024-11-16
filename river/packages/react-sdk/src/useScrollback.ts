'use client'

import { type MessageTimeline, Space, assert } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

export const useScrollback = (
    streamId: string,
    config?: ActionConfig<MessageTimeline['scrollback']>,
) => {
    const sync = useSyncAgent()
    const room = useMemo(() => getRoom(sync, streamId), [sync, streamId])
    assert(!(room instanceof Space), 'cant scrollback spaces')
    const { action: scrollback, ...rest } = useAction(room.timeline, 'scrollback', config)
    return {
        scrollback,
        ...rest,
    }
}
