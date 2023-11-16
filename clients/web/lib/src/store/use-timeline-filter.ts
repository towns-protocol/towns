import { ZTEvent } from '../types/timeline-types'
import { create } from 'zustand'

export type TimelineFilterStates = {
    eventFilter?: Set<ZTEvent>
    filterEvent: (eventType: ZTEvent, isDisabled: boolean) => void
}

export const useTimelineFilter = create<TimelineFilterStates>((set) => ({
    eventFilter: new Set<ZTEvent>(),
    filterEvent: (eventType: ZTEvent, isDisabled: boolean) => {
        set((state) => {
            const filter = new Set<ZTEvent>(state.eventFilter)
            if (isDisabled) {
                filter.add(eventType)
            } else {
                filter.delete(eventType)
            }
            return {
                eventFilter: filter,
            }
        })
    },
}))
