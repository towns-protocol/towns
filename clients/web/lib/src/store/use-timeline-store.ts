import create from 'zustand'

import { TimelineEvent } from '../types/timeline-types'

type TimelinesMap = Record<string, TimelineEvent[]>

export type TimelineStoreStates = {
    timelines: TimelinesMap
    setTimelines: (fn: (prevState: TimelinesMap) => TimelinesMap) => void
}

export const useTimelineStore = create<TimelineStoreStates>((set) => ({
    timelines: {},
    setTimelines: (fn: (prevState: TimelinesMap) => TimelinesMap) => {
        set((state) => ({ timelines: fn(state.timelines) }))
    },
}))
