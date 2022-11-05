import { RoomIdentifier } from '../types/matrix-types'
import { TimelineEvent } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

const EMPTY_TIMELINE: TimelineEvent[] = []

export function useTimeline(roomId?: RoomIdentifier): TimelineEvent[] {
    const timeline = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.timelines[roomId.matrixRoomId] : undefined,
    )
    return timeline ?? EMPTY_TIMELINE
}
