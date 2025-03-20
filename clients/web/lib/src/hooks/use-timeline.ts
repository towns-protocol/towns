import { TimelineStoreStates, useRawTimelineStore } from '../store/use-timeline-store'
import { TimelineEvent } from '@towns-protocol/sdk'
const EMPTY_TIMELINE: TimelineEvent[] = []

export function useTimeline(roomId?: string) {
    const timeline = useRawTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.timelines[roomId] : undefined,
    )
    return {
        timeline: timeline ?? EMPTY_TIMELINE,
    }
}
