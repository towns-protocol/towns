import { MessageReactions } from '@river-build/sdk'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

const EMPTY_REACTIONS: Record<string, MessageReactions> = {}

export function useTimelineReactions(roomId?: string): Record<string, MessageReactions> {
    const reactions = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.reactions[roomId] : undefined,
    )
    return reactions ?? EMPTY_REACTIONS
}
