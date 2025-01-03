import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'
import { TimelineEvent } from '@river-build/sdk'
const EMPTY_TIMELINE: TimelineEvent[] = []

export function useTimeline(roomId?: string) {
    const timeline = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.timelines[roomId] : undefined,
    )
    return {
        timeline: timeline ?? EMPTY_TIMELINE,
    }
}
