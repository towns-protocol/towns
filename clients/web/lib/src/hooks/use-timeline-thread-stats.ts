import { RoomIdentifier } from '../types/matrix-types'
import { ThreadStats } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

export function useTimelineThreadStats(roomId?: RoomIdentifier): Record<string, ThreadStats> {
    const threadStats = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.threadsStats[roomId.matrixRoomId] ?? {} : {},
    )
    return threadStats
}
