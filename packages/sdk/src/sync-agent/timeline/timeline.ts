import { SnapshotCaseType } from '@river-build/proto'
import { Stream } from '../../stream'
import { StreamChange } from '../../streamEvents'
import {
    getEditsId,
    getRedactsId,
    makeRedactionEvent,
    toEvent,
    toReplacedMessageEvent,
} from './models/timelineEvent'
import { LocalTimelineEvent } from '../../types'
import { TimelineEvents } from './models/timelineEvents'
import { Reactions } from './models/reactions'
import type { TimelineEvent, TimelineEventConfirmation } from './models/timeline-types'
import { PendingReplacedEvents } from './models/pendingReplacedEvents'
import { ReplacedEvents } from './models/replacedEvents'
import { ThreadStats } from './models/threadStats'
import { Threads } from './models/threads'
import type { RiverConnection } from '../river-connection/riverConnection'
import type { UserReadMarker } from '../user/models/readMarker'

export class MessageTimeline {
    events = new TimelineEvents()
    replacedEvents = new ReplacedEvents()
    pendingReplacedEvents = new PendingReplacedEvents()
    threadsStats = new ThreadStats()
    threads = new Threads()
    reactions = new Reactions()

    // TODO: figure out a better way to do online check
    // lastestEventByUser = new TimelineEvents()

    // TODO: we probably wont need this for a while
    filterFn: (event: TimelineEvent, kind: SnapshotCaseType) => boolean = (_event, _kind) => {
        return true
    }
    constructor(
        private streamId: string,
        private userId: string,
        private riverConnection: RiverConnection,
        private fullyReadMarkers: UserReadMarker,
    ) {
        //
    }

    initialize(stream: Stream) {
        this.reset()
        stream.off('streamUpdated', this.onStreamUpdated)
        stream.off('streamLocalEventUpdated', this.onStreamLocalEventUpdated)
        stream.on('streamUpdated', this.onStreamUpdated)
        stream.on('streamLocalEventUpdated', this.onStreamLocalEventUpdated)
        const events = stream.view.timeline
            .map((event) => toEvent(event, this.userId))
            .filter((event) => this.filterFn(event, stream.view.contentKind))
        this.appendEvents(events, this.userId)
    }

    async scrollback(): Promise<{ terminus: boolean; firstEvent?: TimelineEvent }> {
        return this.riverConnection.callWithStream(this.streamId, async (client) => {
            return client.scrollback(this.streamId).then(({ terminus, firstEvent }) => ({
                terminus,
                firstEvent: firstEvent ? toEvent(firstEvent, this.userId) : undefined,
            }))
        })
    }

    private reset() {
        this.events.reset()
        this.threads.reset()
        this.threadsStats.reset()
        this.reactions.reset()
        this.pendingReplacedEvents.reset()
        this.replacedEvents.reset()
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
            this.updateEvent(event, localEventId)
        }
    }

    private prependEvents(events: TimelineEvent[], userId: string) {
        for (const event of events.reverse()) {
            const editsEventId = getEditsId(event.content)
            const redactsEventId = getRedactsId(event.content)
            if (redactsEventId) {
                const redactedEvent = makeRedactionEvent(event)
                this.prependEvent(userId, event)
                this.replaceEvent(userId, redactsEventId, redactedEvent)
            } else if (editsEventId) {
                this.replaceEvent(userId, editsEventId, event)
            } else {
                this.prependEvent(userId, event)
            }
        }
    }

    private prependEvent = (_userId: string, inTimelineEvent: TimelineEvent) => {
        const pendingReplace = this.pendingReplacedEvents.get(inTimelineEvent.eventId)
        const timelineEvent = pendingReplace
            ? toReplacedMessageEvent(inTimelineEvent, pendingReplace)
            : inTimelineEvent

        this.events.prepend(timelineEvent)
        this.reactions.addEvent(timelineEvent)
        this.threads.add(timelineEvent)
        this.threadsStats.add(this.userId, timelineEvent, this.events.value)
    }

    private appendEvent(_userId: string, event: TimelineEvent) {
        this.events.append(event)
        this.threads.add(event)
        this.threadsStats.add(this.userId, event, this.events.value)
        this.reactions.addEvent(event)
    }

    private replaceEvent(_userId: string, replacedEventId: string, event: TimelineEvent) {
        const eventIndex = this.events.value.findIndex(
            (e: TimelineEvent) =>
                e.eventId === replacedEventId ||
                (e.localEventId && e.localEventId === event.localEventId),
        )

        if (eventIndex === -1) {
            // if we didn't find an event to replace..
            const pendingReplace = this.pendingReplacedEvents.get(replacedEventId)
            if (
                pendingReplace?.latestEventNum &&
                event?.latestEventNum &&
                pendingReplace.latestEventNum > event.latestEventNum
            ) {
                // if we already have a replacement here, leave it, because we sync backwards, we assume the first one is the correct one
                return
            } else {
                // otherwise add it to the pending list
                this.pendingReplacedEvents.add(replacedEventId, event)
                return
            }
        }
        const oldEvent = this.events.value[eventIndex]
        if (
            event?.latestEventNum &&
            oldEvent?.latestEventNum &&
            event.latestEventNum < oldEvent.latestEventNum
        ) {
            return
        }
        const newEvent = toReplacedMessageEvent(oldEvent, event)
        this.events.replace(event, eventIndex, this.events.value)
        this.replacedEvents.add(event.eventId, oldEvent, newEvent)
        this.reactions.removeEvent(oldEvent)
        this.reactions.addEvent(newEvent)
        this.threadsStats.remove(oldEvent)
        this.threadsStats.add(this.userId, newEvent, this.events.value)

        const threadTimeline = newEvent.threadParentId
            ? this.threads.get(newEvent.threadParentId)
            : undefined
        const threadEventIndex =
            threadTimeline?.findIndex(
                (e) =>
                    e.eventId === replacedEventId ||
                    (e.localEventId && e.localEventId === newEvent.localEventId),
            ) ?? -1
        if (threadEventIndex !== -1) {
            this.threads.replace(newEvent, threadEventIndex)
        } else {
            this.threads.add(newEvent)
        }
    }

    private appendEvents(events: TimelineEvent[], _userId: string) {
        for (const event of events) {
            this.processEvent(event)
        }
    }

    private updateEvents(events: TimelineEvent[], _userId: string) {
        for (const event of events) {
            this.processEvent(event, event.eventId)
        }
    }

    private updateEvent(event: TimelineEvent, updatingEventId?: string) {
        this.processEvent(event, updatingEventId)
    }

    private confirmEvents(
        confirmations: {
            eventId: string
            confirmedInBlockNum: bigint
            confirmedEventNum: bigint
        }[],
    ) {
        for (const confirmation of confirmations) {
            this.confirmEvent(confirmation)
        }
    }

    // Similar to replaceEvent, but we dont only swap out the confirmedInBlockNum and confirmedEventNum
    private confirmEvent(confirmation: TimelineEventConfirmation) {
        const eventIndex = this.events.value.findIndex(
            (e: TimelineEvent) => e.eventId === confirmation.eventId,
        )
        if (eventIndex === -1) {
            return
        }
        const oldEvent = this.events.value[eventIndex]
        const newEvent = {
            ...oldEvent,
            confirmedEventNum: confirmation.confirmedEventNum,
            confirmedInBlockNum: confirmation.confirmedInBlockNum,
        }

        this.events.replace(newEvent, eventIndex, this.events.value)
        this.replacedEvents.add(newEvent.eventId, oldEvent, newEvent)
        // TODO: why we dont change reactions here?
    }

    // handle local pending events, redact and edits
    private processEvent(event: TimelineEvent, updatingEventId?: string) {
        const editsEventId = getEditsId(event.content)
        const redactsEventId = getRedactsId(event.content)

        if (redactsEventId) {
            const redactedEvent = makeRedactionEvent(event)
            this.replaceEvent(this.userId, redactsEventId, redactedEvent)
            if (updatingEventId) {
                // replace the formerly encrypted event
                this.replaceEvent(this.userId, updatingEventId, event)
            } else {
                this.appendEvent(this.userId, event)
            }
        } else if (editsEventId) {
            if (updatingEventId) {
                // remove the formerly encrypted event
                this.removeEvent(updatingEventId)
            }
            this.replaceEvent(this.userId, editsEventId, event)
        } else {
            if (updatingEventId) {
                // replace the formerly encrypted event
                this.replaceEvent(this.userId, updatingEventId, event)
            } else {
                this.appendEvent(this.userId, event)
            }
        }

        const marker = this.fullyReadMarkers.get(this.streamId)
        if (event.sender.id === this.userId) {
            return
        }
        if (event.eventNum > marker.room.eventNum) {
            this.fullyReadMarkers.setData({
                markers: {
                    ...this.fullyReadMarkers.data.markers,
                    [this.streamId]: {
                        room: {
                            ...marker.room,
                            isUnread: true,
                        },
                        threads: marker.threads,
                    },
                },
            })
        }
        if (event.threadParentId) {
            const threadMarker = marker.threads?.[event.threadParentId]
            if (threadMarker && event.eventNum > threadMarker.eventNum) {
                this.fullyReadMarkers.setData({
                    markers: {
                        ...this.fullyReadMarkers.data.markers,
                        [this.streamId]: {
                            room: marker.room,
                            threads: {
                                ...marker.threads,
                                [event.threadParentId]: { ...threadMarker, isUnread: true },
                            },
                        },
                    },
                })
            }
        }
    }

    private removeEvent(eventId: string) {
        const eventIndex = this.events.value.findIndex((e) => e.eventId == eventId)
        if ((eventIndex ?? -1) < 0) {
            return
        }
        const event = this.events.value[eventIndex]
        this.events.removeByIndex(eventIndex)
        this.reactions.removeEvent(event)
        this.threadsStats.remove(event)
        this.threads.remove(event)
    }
}
