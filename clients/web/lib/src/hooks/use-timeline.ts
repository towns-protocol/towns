import { TimelineEvent } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'
import { RoomIdentifier } from '../types/room-identifier'

const EMPTY_TIMELINE: TimelineEvent[] = []

export function useTimeline(roomId?: RoomIdentifier) {
    const timeline = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.timelines[roomId.streamId] : undefined,
    )
    return {
        timeline: timeline ?? EMPTY_TIMELINE,
    }
}
