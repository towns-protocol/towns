import { useMemo } from 'react'
import { RoomIdentifier } from '../types/matrix-types'
import { ThreadStats } from '../types/timeline-types'
import { useTimelineStore } from '../store/use-timeline-store'

export function useTimelineThreadStats(roomId?: RoomIdentifier): Record<string, ThreadStats> {
    const { threadsStats } = useTimelineStore()
    const stats = useMemo(
        () => (roomId ? threadsStats[roomId.matrixRoomId] ?? {} : {}),
        [roomId, threadsStats],
    )
    // todo, test to see if two use memos is necessary at all?
    // the timelines object is changing constantly, every time a new event comes in
    // for any room, but the timeline array should be a little more stable
    return useMemo(() => stats, [stats])
}
