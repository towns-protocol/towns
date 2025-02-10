import { MessageTips } from '../types/timeline-types'
import { TimelineStoreStates, useRawTimelineStore } from '../store/use-timeline-store'

const EMPTY_TIPS: Record<string, MessageTips> = {}

export function useTimelineTips(roomId?: string): Record<string, MessageTips> {
    const tips = useRawTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.tips[roomId] : undefined,
    )
    return tips ?? EMPTY_TIPS
}
