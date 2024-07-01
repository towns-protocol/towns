import { SnapshotCaseType } from '@river-build/proto'
import { Stream } from '../../stream'
import { StreamChange } from '../../streamEvents'
import { TimelineEvent, toEvent } from './models/timelineEvent'
import { LocalTimelineEvent } from '../../types'
import { TimelineEvents } from './models/timelineEvents'

export class Timeline {
    events = new TimelineEvents()
    filterFn: (event: TimelineEvent, kind: SnapshotCaseType) => boolean = (_event, _kind) => {
        return true
    }
    constructor(private userId: string) {
        //
    }

    initialize(stream: Stream) {
        stream.off('streamUpdated', this.onStreamUpdated)
        stream.off('streamLocalEventUpdated', this.onStreamLocalEventUpdated)
        stream.on('streamUpdated', this.onStreamUpdated)
        stream.on('streamLocalEventUpdated', this.onStreamLocalEventUpdated)
        const events = stream.view.timeline
            .map((event) => toEvent(event, this.userId))
            .filter((event) => this.filterFn(event, stream.view.contentKind))
        this.events.setValue(events)
    }

    private onStreamUpdated = (_streamId: string, kind: SnapshotCaseType, change: StreamChange) => {
        const { prepended, appended, updated, confirmed } = change
        if (prepended) {
            const events = prepended
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(event, kind))
            this.prependEvents(events, this.userId)
        }
        if (appended) {
            const events = appended
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(event, kind))
            this.appendEvents(events, this.userId)
        }
        if (updated) {
            const events = updated
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(event, kind))
            this.updateEvents(events, this.userId)
        }
        if (confirmed) {
            const confirmations = confirmed.map((event) => ({
                eventId: event.hashStr,
                confirmedInBlockNum: event.miniblockNum,
                confirmedEventNum: event.confirmedEventNum,
            }))
            this.confirmEvents(confirmations)
        }
    }

    private onStreamLocalEventUpdated = (
        _streamId: string,
        kind: SnapshotCaseType,
        localEventId: string,
        localEvent: LocalTimelineEvent,
    ) => {
        const event = toEvent(localEvent, this.userId)
        if (this.filterFn(event, kind)) {
            this.updateEvent(event, this.userId, localEventId)
        }
    }

    private prependEvents(events: TimelineEvent[], _userId: string) {
        this.events.update((current) => [...events, ...current])
    }

    private appendEvents(events: TimelineEvent[], _userId: string) {
        this.events.update((current) => [...current, ...events])
    }

    private updateEvents(events: TimelineEvent[], _userId: string) {
        this.events.update((current) => {
            const newEvents = [...current]
            for (const event of events) {
                const index = current.findIndex((e) => e.eventId === event.eventId)
                if (index !== -1) {
                    newEvents[index] = event
                }
            }
            return newEvents
        })
    }

    private updateEvent(event: TimelineEvent, userId: string, eventId: string) {
        this.events.update((current) => {
            const index = current.findIndex((e) => e.eventId === eventId)
            if (index !== -1) {
                const newEvents = [...current]
                newEvents[index] = event
                return newEvents
            } else {
                return current
            }
        })
    }

    private confirmEvents(
        _confirmations: {
            eventId: string
            confirmedInBlockNum: bigint
            confirmedEventNum: bigint
        }[],
    ) {
        //
    }
}
