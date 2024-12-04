'use client'

import { type Channel, Space, assert } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

/**
 * Hook to redact your own message in a channel stream.
 * @example
 *
 * ### Redact a message
 *
 * You can use `redact` to redact a message in a stream.
 * ```ts
 * import { useRedact } from '@river-build/react-sdk'
 *
 * const { redact } = useRedact(streamId)
 * redact({ eventId: messageEventId })
 * ```
 *
 * ### Redact a message reaction
 *
 * You can also use `redact` to redact a message reaction in a stream.
 * ```ts
 * import { useRedact } from '@river-build/react-sdk'
 *
 * const { redact } = useRedact(streamId)
 * redact({ eventId: reactionEventId })
 * ```
 * @param streamId - The id of the stream to redact the message in.
 * @param config - Configuration options for the action.
 * @returns The `redact` action and its loading state.
 */
export const useRedact = (streamId: string, config?: ActionConfig<Channel['redact']>) => {
    const sync = useSyncAgent()
    const room = getRoom(sync, streamId)
    assert(!(room instanceof Space), 'Space does not have reactions')
    const { action: redact, ...rest } = useAction(room, 'redact', config)

    return {
        redact,
        ...rest,
    }
}
