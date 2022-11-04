import { RoomIdentifier } from '../types/matrix-types'
import { TimelineEvent } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

export function useTimeline(roomId?: RoomIdentifier): TimelineEvent[] {
    const timeline = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.timelines[roomId.matrixRoomId] ?? [] : [],
    )
    return timeline
}
