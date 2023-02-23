import { create } from 'zustand'
import { MessageReactions, ThreadStats, TimelineEvent } from '../types/timeline-types'

/// TimelinesMap: { roomId: TimelineEvent[] }
export type TimelinesMap = Record<string, TimelineEvent[]>
/// ThreadStatsMap: { roomId: { eventId: ThreadStats } }
export type ThreadStatsMap = Record<string, Record<string, ThreadStats>>
/// ThreadContentMap: { roomId: { eventId: ThreadContent } }
export type ThreadsMap = Record<string, Record<string, TimelineEvent[]>>
/// ReactionsMap: { roomId: { eventId: MessageReactions } }
export type ReactionsMap = Record<string, Record<string, MessageReactions>>

export type TimelineStoreStates = {
    timelines: TimelinesMap
    threadsStats: ThreadStatsMap
    threads: ThreadsMap
    reactions: ReactionsMap
}

export type TimelineStoreInterface = TimelineStoreStates & {
    setState: (fn: (prev: TimelineStoreStates) => TimelineStoreStates) => void
}

export const useTimelineStore = create<TimelineStoreInterface>((set) => ({
    timelines: {},
    threadsStats: {},
    threads: {},
    reactions: {},
    setState: (fn: (prevState: TimelineStoreStates) => TimelineStoreStates) => {
        set((state) => fn(state))
    },
}))
