'use client'

import type { Channel, Gdm } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { type RiverRoom, getRoom } from './utils'

export const useSendMessage = (
    props: RiverRoom,
    config?: (typeof props)['type'] extends 'gdm'
        ? ActionConfig<Gdm['sendMessage']>
        : ActionConfig<Channel['sendMessage']>,
) => {
    const sync = useSyncAgent()
    const room = useMemo(() => getRoom(sync, props), [props, sync])
    const { action: sendMessage, ...rest } = useAction(room, 'sendMessage', config)

    return {
        sendMessage,
        ...rest,
    }
}
