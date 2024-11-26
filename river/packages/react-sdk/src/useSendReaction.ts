'use client'

import { type Channel, Space, assert } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

/**
 * Hook to send a reaction to a message in a stream.
 *
 * Reaction can be any string value, including emojis.
 *
 * @example
 * ```ts
 * import { useSendReaction } from '@river-build/react-sdk'
 *
 * const { sendReaction } = useSendReaction('stream-id')
 * sendReaction(messageEventId, '🔥')
 * ```
 *
 * @param streamId - The id of the stream to send the reaction to.
 * @param config - Configuration options for the action.
 * @returns The `sendReaction` action and its loading state.
 */
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
