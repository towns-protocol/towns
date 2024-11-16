import { Observable } from '../../../observable/observable'
import { type TimelineEvent, type RiverTimelineEvent } from './timeline-types'

export class TimelineEvents extends Observable<TimelineEvent[]> {
    constructor(initialValue: TimelineEvent[] = []) {
        super(initialValue)
    }

    getLatestEvent(kind?: RiverTimelineEvent): TimelineEvent | undefined {
        if (kind) {
            return this.value.find((event) => event.content?.kind === kind)
        }
        return this.value[this.value.length - 1]
    }

    update(fn: (current: TimelineEvent[]) => TimelineEvent[]): void {
        this.setValue(fn(this.value))
    }

    reset() {
        this.setValue([])
    }

    replace(newEvent: TimelineEvent, eventIndex: number, timeline: TimelineEvent[]) {
        const updated = [
            ...timeline.slice(0, eventIndex),
            newEvent,
            ...timeline.slice(eventIndex + 1),
        ]
        this.setValue(updated)
    }

    append(event: TimelineEvent) {
        this.setValue([...this.value, event])
    }

    prepend(event: TimelineEvent) {
        this.setValue([event, ...this.value])
    }

    removeByIndex(eventIndex: number) {
        const newEvents = this.value.slice(0, eventIndex).concat(this.value.slice(eventIndex + 1))
        this.setValue(newEvents)
    }
}
