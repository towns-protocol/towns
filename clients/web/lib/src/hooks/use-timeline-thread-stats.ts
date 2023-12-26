import { ThreadStats } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

const EMPTY_THREAD_STATS: Record<string, ThreadStats> = {}

export function useTimelineThreadStats(roomId?: string): Record<string, ThreadStats> {
    const threadStats = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.threadsStats[roomId] : undefined,
    )
    return threadStats ?? EMPTY_THREAD_STATS
}
