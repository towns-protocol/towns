import { SnapshotCaseType } from '@towns-protocol/proto'
import { Observable } from '../observable/observable'
import { TimelineEvent, RiverTimelineEvent } from '../sync-agent/timeline/models/timeline-types'
import { LocalTimelineEvent, StreamTimelineEvent } from '../types'
import {
    makeTimelineStoreInterface,
    TimelineStoreInterface,
    TimelineStoreStates,
} from './timelineStoreInterface'
import { StreamChange } from '../streamEvents'
import { toDecryptedContentErrorEvent, toDecryptedEvent, toEvent } from './timelineStoreEvents'
import { DecryptedContent } from '../encryptedContentTypes'
import { DecryptionSessionError } from '@towns-protocol/encryption'
import isEqual from 'lodash/isEqual'

export interface TimelineStoreDelegate {
    isDMMessageEventBlocked(event: TimelineEvent, kind: SnapshotCaseType): boolean
}

export class TimelineStore extends Observable<TimelineStoreStates> {
    readonly streamIds = new Set<string>()
    readonly setState: TimelineStoreInterface
    // todo invert this so we don't have to pass the whole client
    constructor(
        public readonly userId: string,
        public readonly delegate: TimelineStoreDelegate | undefined,
        public readonly eventFilter: Set<RiverTimelineEvent> = new Set([
            RiverTimelineEvent.Fulfillment,
            RiverTimelineEvent.KeySolicitation,
        ]),
    ) {
        super({
            timelines: {},
            replacedEvents: {},
            pendingReplacedEvents: {},
            threadsStats: {},
            threads: {},
            reactions: {},
            tips: {},
            lastestEventByUser: {},
        })
        this.setState = makeTimelineStoreInterface(
            (fn: (prevState: TimelineStoreStates) => TimelineStoreStates) => {
                this.setValue(fn(this.value)) // todo batching
            },
        )
    }

    // for backwards compatibility
    getState() {
        return this.value
    }

    initializeStream(streamId: string, kind: SnapshotCaseType, messages: StreamTimelineEvent[]) {
        this.streamIds.add(streamId)
        const timelineEvents = messages
            .map((event) => toEvent(event, this.userId))
            .filter((event) => this.filterFn(event, kind))
        this.setState.appendEvents(timelineEvents, this.userId, streamId, 'initializeStream')
    }

    streamUpdated(streamId: string, kind: SnapshotCaseType, change: StreamChange) {
        const { prepended, appended, updated, confirmed } = change
        this.streamIds.add(streamId)
        if (prepended) {
            const events = prepended
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(event, kind))
            this.setState.prependEvents(events, this.userId, streamId)
        }
        if (appended) {
            const events = appended
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(event, kind))
            this.setState.appendEvents(events, this.userId, streamId)
        }
        if (updated) {
            const events = updated
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(event, kind))
            this.setState.updateEvents(events, this.userId, streamId)
        }
        if (confirmed) {
            const confirmations = confirmed.map((event) => ({
                eventId: event.hashStr,
                confirmedInBlockNum: event.miniblockNum,
                confirmedEventNum: event.confirmedEventNum,
            }))
            this.setState.confirmEvents(confirmations, streamId)
        }
    }

    streamEventDecrypted(
        streamId: string,
        eventId: string,
        decryptedContent: DecryptedContent,
    ): TimelineEvent | undefined {
        const prevEvent = this.getState().timelines[streamId].find(
            (event) => event.eventId === eventId,
        )
        if (prevEvent) {
            const newEvent = toDecryptedEvent(prevEvent, decryptedContent, this.userId)
            if (!isEqual(newEvent, prevEvent)) {
                this.setState.updateEvent(newEvent, this.userId, streamId, eventId)
            }
            return newEvent
        }
        return undefined
    }

    streamEventDecryptedContentError(
        streamId: string,
        eventId: string,
        error: DecryptionSessionError,
    ) {
        const prevEvent = this.getState().timelines[streamId].find(
            (event) => event.eventId === eventId,
        )
        if (prevEvent) {
            const newEvent = toDecryptedContentErrorEvent(prevEvent, error)
            if (newEvent !== prevEvent) {
                this.setState.updateEvent(newEvent, this.userId, streamId, eventId)
            }
        }
    }

    streamLocalEventUpdated(
        streamId: string,
        kind: SnapshotCaseType,
        localEventId: string,
        localEvent: LocalTimelineEvent,
    ) {
        this.streamIds.add(streamId)
        const event = toEvent(localEvent, this.userId)
        if (this.filterFn(event, kind)) {
            this.setState.updateEvent(event, this.userId, streamId, localEventId)
        }
    }

    private filterFn(event: TimelineEvent, kind: SnapshotCaseType): boolean {
        if (this.delegate?.isDMMessageEventBlocked(event, kind) === true) {
            return false
        }
        return (
            !this.eventFilter || !event.content?.kind || !this.eventFilter.has(event.content.kind)
        )
    }
}
