import { Observable } from '../../../observable/observable'
import { type TimelineEvent } from './timeline-types'

// TODO: make this a map of TimelineEvents (map of Observables)
// this could reduce a few rerenders in the react app
type ThreadsMap = Record<string, TimelineEvent[]>

export class Threads extends Observable<ThreadsMap> {
    constructor(initialValue: ThreadsMap = {}) {
        super(initialValue)
    }

    update(fn: (current: ThreadsMap) => ThreadsMap): void {
        this.setValue(fn(this.value))
    }

    reset() {
        this.setValue({})
    }

    get(parentId: string): TimelineEvent[] | undefined {
        return this.value?.[parentId]
    }

    add(event: TimelineEvent) {
        const parentId = event.threadParentId
        if (!parentId) {
            return
        }
        const sorted = [...(this.value[parentId] ?? []), event].sort((a, b) =>
            a.eventNum > b.eventNum ? 1 : -1,
        )
        this.update((current) => ({
            ...current,
            [parentId]: sorted,
        }))
    }

    remove(event: TimelineEvent) {
        const parentId = event.threadParentId
        if (!parentId) {
            return
        }
        const threadEventIndex =
            this.value[parentId]?.findIndex((e) => e.eventId === event.eventId) ?? -1
        if (threadEventIndex === -1) {
            return
        }
        this.update((current) => ({
            ...current,
            [parentId]: current[parentId]
                .splice(0, threadEventIndex)
                .concat(current[parentId].slice(threadEventIndex + 1)),
        }))
    }

    replace(event: TimelineEvent, eventIndex: number) {
        const parentId = event.threadParentId
        if (!parentId) {
            return
        }
        this.update((current) => ({
            ...current,
            [parentId]: [
                ...current[parentId].slice(0, eventIndex),
                event,
                ...current[parentId].slice(eventIndex + 1),
            ],
        }))
    }
}
