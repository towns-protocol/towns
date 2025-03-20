import { MessageReactions } from '@towns-protocol/sdk'
import { TimelineStoreStates, useRawTimelineStore } from '../store/use-timeline-store'

const EMPTY_REACTIONS: Record<string, MessageReactions> = {}

export function useTimelineReactions(roomId?: string): Record<string, MessageReactions> {
    const reactions = useRawTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.reactions[roomId] : undefined,
    )
    return reactions ?? EMPTY_REACTIONS
}
