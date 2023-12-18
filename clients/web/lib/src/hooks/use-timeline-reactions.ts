import { RoomIdentifier } from '../types/room-identifier'
import { MessageReactions } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

const EMPTY_REACTIONS: Record<string, MessageReactions> = {}

export function useTimelineReactions(roomId?: RoomIdentifier): Record<string, MessageReactions> {
    const reactions = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.reactions[roomId.streamId] : undefined,
    )
    return reactions ?? EMPTY_REACTIONS
}
