'use client'

import { type MessageTimeline, Space, assert } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

/**
 * Hook to get the scrollback action for a stream.
 *
 * Scrollback is the action of getting miniblocks from a stream before a certain point in time.
 * Getting miniblocks means that new events that are possibly new messages, reactions and so on are fetched.
 *
 * @param streamId - The id of the stream to get the scrollback action for.
 * @param config - Configuration options for the action.
 * @returns The `scrollback` action and its loading state.
 */
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
