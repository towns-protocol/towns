import { Observable } from '../../../observable/observable'
import { TimelineEvent } from './timeline-types'

type PendingReplacedEventsMap = Record<string, TimelineEvent>
// eventId -> TimelineEvent
export class PendingReplacedEvents extends Observable<PendingReplacedEventsMap> {
    constructor(initialValue: Record<string, TimelineEvent> = {}) {
        super(initialValue)
    }

    update(fn: (current: PendingReplacedEventsMap) => PendingReplacedEventsMap): void {
        this.setValue(fn(this.value))
    }

    reset() {
        this.setValue({})
    }

    get(eventId: string): TimelineEvent | undefined {
        return this.value?.[eventId]
    }

    add(eventId: string, event: TimelineEvent) {
        this.update((current) => ({ ...current, [eventId]: event }))
    }
}
