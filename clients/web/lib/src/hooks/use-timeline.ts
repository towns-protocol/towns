import { TimelineEvent } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'
import { RoomIdentifier } from '../types/room-identifier'
import { useTimelineRedecryptor } from './use-timeline-redecryptor'

const EMPTY_TIMELINE: TimelineEvent[] = []

export function useTimeline(roomId?: RoomIdentifier) {
    const timeline = useTimelineStore((state: TimelineStoreStates) =>
        roomId ? state.timelines[roomId.networkId] : undefined,
    )
    const decryptionAttempts = useTimelineRedecryptor(roomId, timeline)
    return {
        timeline: timeline ?? EMPTY_TIMELINE,
        decryptionAttempts,
    }
}
