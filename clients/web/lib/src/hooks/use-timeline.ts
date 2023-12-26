import { TimelineEvent } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

const EMPTY_TIMELINE: TimelineEvent[] = []

export function useTimeline(roomId?: string) {
    const timeline = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.timelines[roomId] : undefined,
    )
    return {
        timeline: timeline ?? EMPTY_TIMELINE,
    }
}
