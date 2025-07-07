import { Observable } from '../../observable/observable'
import { TimelineEvent, RiverTimelineEvent } from '../models/timelineTypes'
import { LocalTimelineEvent, StreamTimelineEvent } from '../../types'
import {
    makeTimelinesViewInterface,
    TimelinesViewInterface,
    TimelinesViewModel,
} from './timelinesModel'
import { StreamChange } from '../../streamEvents'
import { toDecryptedContentErrorEvent, toDecryptedEvent, toEvent } from '../models/timelineEvent'
import { DecryptedContent } from '../../encryptedContentTypes'
import { DecryptionSessionError } from '../../decryptionExtensions'
import { isEqual } from 'lodash-es'
import { isDMChannelStreamId } from '../../id'

export interface TimelinesViewDelegate {
    isDMMessageEventBlocked(event: TimelineEvent): boolean
}

export class TimelinesView extends Observable<TimelinesViewModel> {
    readonly streamIds = new Set<string>()
    readonly setState: TimelinesViewInterface
    // todo invert this so we don't have to pass the whole client
    constructor(
        public readonly userId: string,
        public readonly delegate: TimelinesViewDelegate | undefined,
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
        this.setState = makeTimelinesViewInterface(
            (fn: (prevState: TimelinesViewModel) => TimelinesViewModel) => {
                this.setValue(fn(this.value))
            },
        )
    }

    streamInitialized(streamId: string, messages: StreamTimelineEvent[]) {
        this.streamIds.add(streamId)
        const timelineEvents = messages
            .map((event) => toEvent(event, this.userId))
            .filter((event) => this.filterFn(streamId, event))
        this.setState.appendEvents(timelineEvents, this.userId, streamId, 'initializeStream')
    }

    streamUpdated(streamId: string, change: StreamChange) {
        const { prepended, appended, updated, confirmed } = change
        this.streamIds.add(streamId)
        if (prepended) {
            const events = prepended
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(streamId, event))
            this.setState.prependEvents(events, this.userId, streamId)
        }
        if (appended) {
            const events = appended
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(streamId, event))
            this.setState.appendEvents(events, this.userId, streamId)
        }
        if (updated) {
            const events = updated
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(streamId, event))
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
        const prevEvent = this.value.timelines[streamId].find((event) => event.eventId === eventId)
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
        const prevEvent = this.value.timelines[streamId].find((event) => event.eventId === eventId)
        if (prevEvent) {
            const newEvent = toDecryptedContentErrorEvent(prevEvent, error)
            if (newEvent !== prevEvent) {
                this.setState.updateEvent(newEvent, this.userId, streamId, eventId)
            }
        }
    }

    streamLocalEventUpdated(
        streamId: string,
        localEventId: string,
        localEvent: LocalTimelineEvent,
    ) {
        this.streamIds.add(streamId)
        const event = toEvent(localEvent, this.userId)
        if (this.filterFn(streamId, event)) {
            this.setState.updateEvent(event, this.userId, streamId, localEventId)
        }
    }

    private filterFn(streamId: string, event: TimelineEvent): boolean {
        if (
            isDMChannelStreamId(streamId) &&
            this.delegate?.isDMMessageEventBlocked(event) === true
        ) {
            return false
        }
        return (
            !this.eventFilter || !event.content?.kind || !this.eventFilter.has(event.content.kind)
        )
    }
}
