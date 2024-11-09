'use client'

import { type Channel, Space, assert } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

export const useSendMessage = (
    streamId: string,
    // TODO: now that we're using runtime check for room type, Gdm/Dm will have the same config as Channel.
    // Its not a problem, both should be the same, but we need more abstractions around this on the SyncAgent
    config?: ActionConfig<Channel['sendMessage']>,
) => {
    const sync = useSyncAgent()
    const room = useMemo(() => getRoom(sync, streamId), [streamId, sync])
    assert(!(room instanceof Space), 'room cant be a space')
    const { action: sendMessage, ...rest } = useAction(room, 'sendMessage', config)

    return {
        sendMessage,
        ...rest,
    }
}
