import create from 'zustand'

import { ThreadStats, TimelineEvent } from '../types/timeline-types'

type TimelinesMap = Record<string, TimelineEvent[]>
type ThreadStatsMap = Record<string, Record<string, ThreadStats>>

export type TimelineStoreStates = {
    timelines: TimelinesMap
    setTimelines: (fn: (prevState: TimelinesMap) => TimelinesMap) => void
    threadsStats: ThreadStatsMap
    setThreadStats: (fn: (prevState: ThreadStatsMap) => ThreadStatsMap) => void
}

export const useTimelineStore = create<TimelineStoreStates>((set) => ({
    timelines: {},
    setTimelines: (fn: (prevState: TimelinesMap) => TimelinesMap) => {
        set((state) => ({ timelines: fn(state.timelines) }))
    },
    threadsStats: {},
    setThreadStats: (fn: (prevState: ThreadStatsMap) => ThreadStatsMap) => {
        set((state) => ({ threadsStats: fn(state.threadsStats) }))
    },
}))
