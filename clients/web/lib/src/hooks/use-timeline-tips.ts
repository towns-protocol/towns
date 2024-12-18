import { MessageTips } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

const EMPTY_TIPS: Record<string, MessageTips> = {}

export function useTimelineTips(roomId?: string): Record<string, MessageTips> {
    const tips = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.tips[roomId] : undefined,
    )
    return tips ?? EMPTY_TIPS
}
