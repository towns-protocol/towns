import { Observable } from '../../../observable/observable'
import { TimelineEvent } from './timelineEvent'

export class TimelineEvents extends Observable<TimelineEvent[]> {
    constructor(initialValue: TimelineEvent[] = []) {
        super(initialValue)
    }

    update(fn: (current: TimelineEvent[]) => TimelineEvent[]): void {
        this.setValue(fn(this.value))
    }
}
