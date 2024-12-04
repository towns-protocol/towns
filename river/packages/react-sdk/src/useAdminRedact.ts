'use client'

import { Channel, Space, assert } from '@river-build/sdk'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

/**
 * Hook to redact any message in a channel if you're an admin.
 * @example
 *
 * ### Redact a message
 *
 * You can use `adminRedact` to redact a message in a stream.
 * ```ts
 * import { useAdminRedact } from '@river-build/react-sdk'
 *
 * const { adminRedact } = useAdminRedact(streamId)
 * adminRedact({ eventId: messageEventId })
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
export const useAdminRedact = (streamId: string, config?: ActionConfig<Channel['adminRedact']>) => {
    const sync = useSyncAgent()
    const room = getRoom(sync, streamId)
    assert(!(room instanceof Space), 'Spaces dont have timeline to redact')
    const { action: adminRedact, ...rest } = useAction(room, 'adminRedact', config)

    return {
        adminRedact,
        ...rest,
    }
}
