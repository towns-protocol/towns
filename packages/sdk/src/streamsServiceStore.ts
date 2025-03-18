import { Envelope, SyncCookie, EnvelopeSchema, StreamEventSchema } from '@towns-protocol/proto'
import Dexie from 'dexie'
import { check } from '@towns-protocol/dlog'
import { isDefined } from './check'
import { EventSignatureBundle } from '@towns-protocol/encryption'
import { ConfirmedEvent } from './types'
import { create, toBinary } from '@bufbuild/protobuf'
import { unpackEnvelope, UnpackEnvelopeOpts } from './sign'

/*
StreamsServiceStore
saves stream data from the server in an optimal format
snapshots are fast forwared on every miniblock, and the latest snapshot is saved
then only events that are rendered in the timeline are saved
the stream record saves the sync cookie, and the gaps in the timeline so scrollback 
happen in an optimal way
this class is used by the StreamsService to save data
We store protos in Uint8Arrays in the db to preserve backwards compatibility in the instance of a protocol upgrad
when encoding to and from binary, protobufs properly store and restore $unknown fields, meaning that data 
can be saved with an old client and then be loaded properly after the client is updated 
profiling shows that fromBinary takes hundredths of a millisecond per channel message, and we save some time when 
indexdb is saving a Uint8Array instead of a StreamEvent
*/

export const ROOT_EVENT_SPAN_SIZE = 25
export const CHILD_EVENT_SPAN_SIZE = 200

// bookkeeping for the stream, holds last sync cookie, and the gaps in the timeline
export interface StreamCookieRecord {
    streamId: string
    syncCookie: SyncCookie
    minipoolBytes: Envelope[]
    lastEventNum: bigint // needed for adding latest unconfirmed events
}

// all events for a stream, seems weird to not normalize and have a table of events,
// but indexdb is dog slow and just pulling everything out of the db at once is much much faster
// event record is a linked list where id==streamId is the root
export interface EventsRecord {
    // root event record
    id: string
    // parent event record
    nextId?: string
    // stream id
    streamId: string
    // bookkeeping of spans of contiguous miniblocks which may or may not have events
    miniblockSpan: MiniblockSpan
    // map of miniblockNum to confirmedEvent[]
    timelineEvents: Record<string, ConfirmedEventBytes[]>
    // whether the stream has terminated, reset if events are pruned
    terminus: boolean
}

// internal representation of a stream record
export interface LoadedStreamBytes {
    streamCookie: StreamCookieRecord
    snapshot: SnapshotRecord
    events: EventsRecord
}

export interface MiniblockSpan {
    fromInclusive: bigint
    toExclusive: bigint
}

// snapshot of the stream at a given miniblock, snapshots can be very large, don't load if we don't need to
export interface SnapshotRecord {
    streamId: string
    snapshotBytes: Uint8Array // protobuf:Snapshot
    snapshotSignature: EventSignatureBundle
}

export interface ConfirmedEventBytes {
    envelope: Envelope
    eventNum: bigint
    miniblockNum: bigint
}

export class StreamsServiceStore extends Dexie {
    streamCookies!: Dexie.Table<StreamCookieRecord>
    snapshots!: Dexie.Table<SnapshotRecord>
    events!: Dexie.Table<EventsRecord>
    constructor(opts: {
        // should be unique per environment, but doesn't have to be per client (can use when logged out or share between users)
        dbName: string
        // log id for logging
        logId?: string
    }) {
        super(opts.dbName)
        this.version(1).stores({
            streamCookies: '&streamId',
            snapshots: '&streamId',
            events: '&id',
        })
    }

    async loadStream(streamId: string): Promise<LoadedStreamBytes | undefined> {
        return this.transaction(
            'r',
            [this.streamCookies, this.events, this.snapshots],
            async () => {
                console.log('syn####loadStream', streamId)
                const before = performance.now()
                const streamCookie = await this.streamCookies.get(streamId)
                const snapshot = await this.snapshots.get(streamId)
                const events = await this.events.get(streamId)
                if (streamCookie && snapshot && events) {
                    console.log(
                        'syn####loadStream: loaded manifest, snapshot, and events',
                        streamId,
                        performance.now() - before,
                    )
                    return {
                        streamCookie,
                        snapshot,
                        events,
                    }
                } else if (streamCookie || snapshot || events) {
                    console.error('syn####loadStream: loaded partial data', streamId, {
                        manifest: streamCookie ? 'yes' : 'no',
                        snapshot: snapshot ? 'yes' : 'no',
                        events: events ? 'yes' : 'no',
                    })
                }
                return undefined
            },
        )
    }

    async loadStreams(streamIds: string[]): Promise<LoadedStreamBytes[]> {
        return this.transaction(
            'r',
            [this.streamCookies, this.events, this.snapshots],
            async () => {
                const before = performance.now()
                const streamCookies = await this.streamCookies.bulkGet(streamIds)
                const snapshots = await this.snapshots.bulkGet(streamIds)
                const events = await this.events.bulkGet(streamIds)
                const t2 = performance.now()
                console.log(
                    'syn####loadStreams: loaded manifests and snapshots and events!!',
                    t2 - before,
                )
                const snapshotsMap = snapshots.reduce((acc, snapshot) => {
                    if (snapshot) {
                        acc[snapshot.streamId] = snapshot
                    }
                    return acc
                }, {} as Record<string, SnapshotRecord>)
                const eventsMap = events.reduce((acc, event) => {
                    if (event) {
                        acc[event.streamId] = event
                    }
                    return acc
                }, {} as Record<string, EventsRecord>)
                const streams: LoadedStreamBytes[] = []
                for (const streamCookie of streamCookies.filter(isDefined)) {
                    const snapshot = snapshotsMap[streamCookie.streamId]
                    const events = eventsMap[streamCookie.streamId]
                    if (snapshot && events) {
                        streams.push({ streamCookie, snapshot, events })
                    }
                }
                console.log(
                    'syn####loadStreams: loaded events!!',
                    streams.length,
                    performance.now() - t2,
                )
                return streams
            },
        )
    }

    async putStream(params: {
        streamCookie: StreamCookieRecord
        events?: EventsRecord[]
        snapshotBytes?: Uint8Array // protobuf:Snapshot
        snapshotSignature?: EventSignatureBundle
    }) {
        await this.transaction(
            'rw',
            [this.streamCookies, this.events, this.snapshots],
            async () => {
                // pull the manifest
                const { streamCookie, events, snapshotBytes, snapshotSignature } = params
                const streamId = streamCookie.streamId
                // save
                await this.streamCookies.put(streamCookie)
                if (events) {
                    await this.events.bulkPut(events)
                }
                if (snapshotBytes) {
                    check(isDefined(snapshotSignature), 'snapshot signature is required')
                    await this.snapshots.put({
                        streamId,
                        snapshotBytes,
                        snapshotSignature,
                    })
                }
            },
        )
    }

    async putEvents(eventsRecord: EventsRecord): Promise<void> {
        await this.events.put(eventsRecord)
    }

    async bulkPutEvents(eventsRecords: EventsRecord[]): Promise<void> {
        await this.events.bulkPut(eventsRecords)
    }

    async getStreamCookie(streamId: string): Promise<StreamCookieRecord | undefined> {
        return this.streamCookies.get(streamId)
    }

    async getSnapshot(id: string): Promise<SnapshotRecord | undefined> {
        return this.snapshots.get(id)
    }

    async getEvents(streamId: string) {
        return this.events.get(streamId)
    }
}

export function prependEventsToRecord(params: {
    eventsRecord: EventsRecord
    timelineEvents: ConfirmedEventBytes[]
    miniblockSpan: MiniblockSpan
    terminus: boolean
}) {
    const { eventsRecord, timelineEvents, miniblockSpan, terminus } = params
    // prepending evetns should always be contiguous
    check(
        eventsRecord.miniblockSpan.fromInclusive === miniblockSpan.toExclusive,
        'miniblock span is not contiguous',
    )
    // are we the root?
    const isRoot = eventsRecord.id === eventsRecord.streamId
    const maxSpanSize = isRoot ? ROOT_EVENT_SPAN_SIZE : CHILD_EVENT_SPAN_SIZE

    // check if we have enough space
    if (countTimelineEvents(eventsRecord.timelineEvents) + timelineEvents.length <= maxSpanSize) {
        // put the events in the map
        const newSpan = {
            fromInclusive: eventsRecord.miniblockSpan.fromInclusive,
            toExclusive: miniblockSpan.toExclusive,
        }
        eventsRecord.miniblockSpan = newSpan
        eventsRecord.timelineEvents = {
            ...eventsRecord.timelineEvents,
            ...reduceEvents(timelineEvents, newSpan),
        }
        eventsRecord.terminus = terminus
        return [eventsRecord]
    } else {
        // we need to create a new child
        const childEventsRecord: EventsRecord = {
            id: `${eventsRecord.id}-${miniblockSpan.fromInclusive.toString()}`, // aellis i think this is sufficent for uniqueness
            streamId: eventsRecord.streamId,
            nextId: eventsRecord.nextId, // linked list insertion
            miniblockSpan,
            timelineEvents: reduceEvents(timelineEvents, miniblockSpan),
            terminus: terminus,
        }
        eventsRecord.nextId = childEventsRecord.id
        return [eventsRecord, childEventsRecord]
    }
}

/// either update eventsRecord and maybe move events to nextEventsRecord or create a new child or create a new root
export function appendEventsToRecord(params: {
    eventsRecord: EventsRecord
    nextEventsRecord: EventsRecord | undefined
    timelineEvents: ConfirmedEventBytes[]
    miniblockSpan: MiniblockSpan
}) {
    const { eventsRecord, nextEventsRecord, timelineEvents, miniblockSpan } = params
    // appending events should always happen on the root
    check(eventsRecord.id === eventsRecord.streamId, 'must be root')
    // event records should be linked list
    check(
        !nextEventsRecord || nextEventsRecord?.id === eventsRecord.nextId,
        'next events record is not linked',
    )

    // if we have a gap, we create a new events record and a new child record
    if (miniblockSpan.fromInclusive > eventsRecord.miniblockSpan.toExclusive) {
        // copy existing to a child
        const childEventsRecord: EventsRecord = {
            ...eventsRecord,
            id: `${eventsRecord.id}-${eventsRecord.miniblockSpan.fromInclusive.toString()}`, // aellis i think this is sufficent for uniqueness
        }
        // create a new root
        const newRootRecord: EventsRecord = {
            id: eventsRecord.id,
            streamId: eventsRecord.streamId,
            nextId: childEventsRecord.id,
            miniblockSpan,
            timelineEvents: reduceEvents(timelineEvents, miniblockSpan),
            terminus: miniblockSpan.fromInclusive === 0n,
        }
        return [newRootRecord, childEventsRecord]
    } else if (miniblockSpan.toExclusive < eventsRecord.miniblockSpan.toExclusive) {
        throw new Error(
            `out of date span passed to appendEventsToRecord ${miniblockSpan.toExclusive} < ${eventsRecord.miniblockSpan.toExclusive}`,
        )
    } else if (miniblockSpan.fromInclusive < eventsRecord.miniblockSpan.fromInclusive) {
        throw new Error(
            `out of date span passed to appendEventsToRecord ${miniblockSpan.fromInclusive} < ${eventsRecord.miniblockSpan.fromInclusive}`,
        )
    } else {
        console.log('syn####appendEventsToRecord: appending events to record', {
            id: eventsRecord.id,
            existingSpan: eventsRecord.miniblockSpan,
            newSpan: miniblockSpan,
        })
    }

    // append the events
    const newSpan = {
        fromInclusive: eventsRecord.miniblockSpan.fromInclusive,
        toExclusive: miniblockSpan.toExclusive,
    }
    eventsRecord.timelineEvents = {
        ...eventsRecord.timelineEvents,
        ...reduceEvents(timelineEvents, newSpan),
    }
    eventsRecord.miniblockSpan = newSpan

    if (countTimelineEvents(eventsRecord.timelineEvents) <= ROOT_EVENT_SPAN_SIZE) {
        // We're good! we have space and just modified existing record
        return [eventsRecord]
    } else if (
        nextEventsRecord &&
        nextEventsRecord.miniblockSpan.toExclusive === eventsRecord.miniblockSpan.fromInclusive &&
        countTimelineEvents(nextEventsRecord.timelineEvents) <= CHILD_EVENT_SPAN_SIZE
    ) {
        migrateEventsToChild(eventsRecord, nextEventsRecord)
        return [eventsRecord, nextEventsRecord]
    } else {
        // we need to create a new child
        const childEventsRecord: EventsRecord = {
            id: `${eventsRecord.id}-${eventsRecord.miniblockSpan.fromInclusive.toString()}`, // aellis i think this is sufficent for uniqueness
            streamId: eventsRecord.streamId,
            nextId: nextEventsRecord?.id,
            miniblockSpan: {
                fromInclusive: eventsRecord.miniblockSpan.fromInclusive,
                toExclusive: eventsRecord.miniblockSpan.fromInclusive,
            },
            timelineEvents: {},
            terminus: eventsRecord.terminus,
        }
        migrateEventsToChild(eventsRecord, childEventsRecord)
        eventsRecord.nextId = childEventsRecord.id
        return [eventsRecord, childEventsRecord]
    }
}

function migrateEventsToChild(root: EventsRecord, child: EventsRecord) {
    check(
        child.miniblockSpan.toExclusive === root.miniblockSpan.fromInclusive,
        'child is not contiguous',
    )
    const newEventsCount = countTimelineEvents(root.timelineEvents)
    // we need to move some events to the child
    let counter = 0
    let i = root.miniblockSpan.fromInclusive
    while (
        newEventsCount - counter > ROOT_EVENT_SPAN_SIZE && // keep going till we move enough events
        i < root.miniblockSpan.toExclusive - 1n && // but always keep at least one block in the span
        Object.keys(root.timelineEvents).length > 1 // and always keep at least one block's worth of events
    ) {
        const key = i.toString()
        const events = root.timelineEvents[key]
        if (events) {
            child.timelineEvents[key] = events
            delete root.timelineEvents[key]
            counter += events.length
        }
        i++
    }
    child.miniblockSpan.toExclusive = i
    root.miniblockSpan.fromInclusive = i
}

export function reduceEvents(timelineEvents: ConfirmedEventBytes[], span: MiniblockSpan) {
    return timelineEvents.reduce((acc, event) => {
        if (event.miniblockNum >= span.fromInclusive && event.miniblockNum < span.toExclusive) {
            const key = event.miniblockNum.toString()
            const existingEvents = acc[key] ?? []
            acc[key] = [...existingEvents, event]
        }
        return acc
    }, {} as Record<string, ConfirmedEventBytes[]>)
}

function countTimelineEvents(timelineEvents?: Record<string, ConfirmedEventBytes[]>) {
    return timelineEvents
        ? Object.values(timelineEvents).reduce((acc, events) => acc + events.length, 0)
        : 0
}

export function getConfirmedEventsFromRecord(
    eventsRecord: EventsRecord,
    span: MiniblockSpan,
): ConfirmedEventBytes[] {
    const returnValue: ConfirmedEventBytes[] = []
    for (let i = span.fromInclusive; i < span.toExclusive; i++) {
        const key = i.toString()
        const events = eventsRecord.timelineEvents[key]
        if (events) {
            returnValue.push(...events)
        }
    }
    return returnValue
}

export function toConfirmedEventBytes(event: ConfirmedEvent): ConfirmedEventBytes {
    check(isDefined(event.event.signature), 'event signature is required')
    return {
        envelope: create(EnvelopeSchema, {
            signature: event.event.signature,
            hash: event.event.hash,
            event: toBinary(StreamEventSchema, event.event.event),
        }),
        eventNum: event.eventNum,
        miniblockNum: event.miniblockNum,
    }
}

export async function toConfirmedEvent(
    eventBytes: ConfirmedEventBytes,
    opts: UnpackEnvelopeOpts | undefined,
): Promise<ConfirmedEvent> {
    const event = await unpackEnvelope(eventBytes.envelope, opts)
    return {
        event,
        eventNum: eventBytes.eventNum,
        miniblockNum: eventBytes.miniblockNum,
    }
}
