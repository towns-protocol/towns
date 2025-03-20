import { RiverTimelineEvent } from '@towns-protocol/sdk'
import { create } from 'zustand'

export type TimelineFilterStates = {
    eventFilter?: Set<RiverTimelineEvent>
    filterEvent: (eventType: RiverTimelineEvent, isDisabled: boolean) => void
}

export const useTimelineFilter = create<TimelineFilterStates>((set) => ({
    eventFilter: new Set<RiverTimelineEvent>(),
    filterEvent: (eventType: RiverTimelineEvent, isDisabled: boolean) => {
        set((state) => {
            const filter = new Set<RiverTimelineEvent>(state.eventFilter)
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
