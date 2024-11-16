import { Observable } from '../../../observable/observable'
import { TimelineEvent } from './timeline-types'

// eventId -> { oldEvent: TimelineEvent; newEvent: TimelineEvent }
type ReplacedEventsMap = Record<string, { oldEvent: TimelineEvent; newEvent: TimelineEvent }>

export class ReplacedEvents extends Observable<ReplacedEventsMap> {
    constructor(initialValue: ReplacedEventsMap = {}) {
        super(initialValue)
    }

    update(fn: (current: ReplacedEventsMap) => ReplacedEventsMap): void {
        this.setValue(fn(this.value))
    }

    reset() {
        this.setValue({})
    }

    get(eventId: string): { oldEvent: TimelineEvent; newEvent: TimelineEvent } | undefined {
        return this.value?.[eventId]
    }

    add(eventId: string, oldEvent: TimelineEvent, newEvent: TimelineEvent) {
        this.update((current) => ({ ...current, [eventId]: { oldEvent, newEvent } }))
    }
}
