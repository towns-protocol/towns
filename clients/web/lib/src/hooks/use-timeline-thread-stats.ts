import { TimelineStoreStates, useRawTimelineStore } from '../store/use-timeline-store'
import { ThreadStatsData } from '@towns-protocol/sdk'

const EMPTY_THREAD_STATS: Record<string, ThreadStatsData> = {}

export function useTimelineThreadStats(roomId?: string): Record<string, ThreadStatsData> {
    const threadStats = useRawTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.threadsStats[roomId] : undefined,
    )
    return threadStats ?? EMPTY_THREAD_STATS
}
