import create from 'zustand'

import { ThreadStats, TimelineEvent } from '../types/timeline-types'

export type TimelinesMap = Record<string, TimelineEvent[]>
export type ThreadStatsMap = Record<string, Record<string, ThreadStats>>

export type TimelineStoreStates = {
    timelines: TimelinesMap
    threadsStats: ThreadStatsMap
}

export type TimelineStoreInterface = TimelineStoreStates & {
    setState: (fn: (prev: TimelineStoreStates) => TimelineStoreStates) => void
}

export const useTimelineStore = create<TimelineStoreInterface>((set) => ({
    timelines: {},
    threadsStats: {},
    setState: (fn: (prevState: TimelineStoreStates) => TimelineStoreStates) => {
        set((state) => fn(state))
    },
}))
