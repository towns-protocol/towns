'use client'

import { type Channel, Space, assert } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

export const useSendReaction = (
    streamId: string,
    config?: ActionConfig<Channel['sendReaction']>,
) => {
    const sync = useSyncAgent()
    const room = getRoom(sync, streamId)
    assert(!(room instanceof Space), 'Space does not have reactions')

    const { action: sendReaction, ...rest } = useAction(room, 'sendReaction', config)

    return {
        sendReaction,
        ...rest,
    }
}
