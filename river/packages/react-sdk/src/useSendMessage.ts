'use client'

import { Channel, Space, assert } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

/**
 * Hook to send a message to a stream. Can be used to send a message to a channel or a dm/group dm.
 * @param streamId - The id of the stream to send the message to.
 * @param config - Configuration options for the action. @see {@link ActionConfig}
 * @returns The sendMessage action and the status of the action.
 */
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
        /** Sends a message to the stream.
         * @param message - The message to send.
         * @param options - Additional options for the message.
         * @returns The event id of the message.
         */
        sendMessage,
        ...rest,
    }
}
