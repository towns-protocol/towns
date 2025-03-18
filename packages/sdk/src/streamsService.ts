import TypedEventEmitter from 'typed-emitter'
import { getMiniblocks, StreamRpcClient, StreamRpcClientOptions } from './makeStreamRpcClient'
import { SyncedStreamEvents } from './streamEvents'
import {
    LoadedStreamBytes,
    StreamsServiceStore,
    StreamCookieRecord,
    MiniblockSpan,
    EventsRecord,
    toConfirmedEvent,
    toConfirmedEventBytes,
    getConfirmedEventsFromRecord,
    prependEventsToRecord,
    reduceEvents,
    appendEventsToRecord,
} from './streamsServiceStore'
import { ISyncedStream, PingInfo, SyncedStreamsLoop, SyncState } from './syncedStreamsLoop'
import { bin_toHexString, check, dlog, dlogError, DLogger } from '@towns-protocol/dlog'
import { unpackEnvelope, UnpackEnvelopeOpts, unpackStream, unpackStreamEx } from './sign'
import { isMediaStreamId, streamIdAsBytes, streamIdAsString } from './id'
import { isDefined } from './check'
import {
    SyncCookie,
    PlainMessage,
    CreateStreamRequest,
    GetStreamResponse,
    CreateStreamResponse,
    CreateMediaStreamRequest,
    Miniblock,
    MiniblockHeader,
    AddEventRequestSchema,
    AddMediaEventRequestSchema,
    InfoRequestSchema,
    GetStreamExRequestSchema,
    Snapshot,
    SnapshotSchema,
    EnvelopeSchema,
    Envelope,
    StreamEventSchema,
    Err,
} from '@towns-protocol/proto'
import { clone, create, fromBinary, MessageInitShape, toBinary } from '@bufbuild/protobuf'
import {
    ConfirmedEvent,
    getEventSignature,
    ParsedEvent,
    ParsedMiniblock,
    ParsedStreamResponse,
    StreamTimelineEvent,
} from './types'
import { IPersistenceStore } from './persistenceStore'
import { CallOptions } from '@connectrpc/connect'
import { SyncedStream } from './syncedStream'
import { EventSignatureBundle } from '@towns-protocol/encryption'
import { isPersistedEvent } from './streamUtils'
import { updateSnapshot } from './snapshot'
/*

StreamsService is a wrapper around the StreamRpcClient that provides a more convenient API for interacting with streams.

It is used to create streams, add events to streams, and sync streams.

It also provides a way to listen for events from streams and to modify the sync state of a stream.

It DOES NOT and should not know anything above the Stream abstraction. this means
- no user management
- no space management
- no channel management
- etc...


With this client you can
- create streams
- add events to streams
- get stream
- sync streams
- listen for events from streams
- modify the sync state of a stream

Getting a stream
- will take the get stream response, apply and snapshot mutations, and return snapshot and a list of timeline events 
- will cache the stream in persistence

Sycncing a stream
- will load stream from persistence or fetch latest from remote
- will enqueue the stream to sync


*/

// when we load a stream from persistence, we don't need to validate hashes or signatures
const localUnpackEnvelopeOpts: UnpackEnvelopeOpts = {
    disableHashValidation: true,
    disableSignatureValidation: true,
}

/// StreamManifest: least amount of data to store in memory, tracks what's been loaded and what's next
export interface StreamManifest {
    streamId: string
    syncCookie: SyncCookie
    minipool: ParsedEvent[]
    miniblockSpan: MiniblockSpan
    currentEventsRecordId: string
    nextEventsRecordId?: string
    lastEventNum: bigint
    terminus: boolean
}

export interface LoadedStream2 {
    // toDo StreamModel
    streamId: string
    manifest: StreamManifest
    timelineEvents: ConfirmedEvent[]
    snapshot: Snapshot
    snapshotSignature: EventSignatureBundle
}

export class StreamsService {
    private highPriorityIds: Set<string> = new Set()
    private readonly streamsServiceStore: StreamsServiceStore
    private syncedStreamsLoop: SyncedStreamsLoop | undefined
    private readonly log: DLogger
    private readonly logDebug: DLogger
    private readonly logError: DLogger
    private readonly manifests: Record<string, StreamManifest> = {}

    constructor(
        private readonly rpcClient: StreamRpcClient,
        private readonly clientEmitter: TypedEventEmitter<SyncedStreamEvents>,
        private readonly persistenceStore: IPersistenceStore, // todo - remove this dependency
        private readonly opts: {
            // log id for logging
            logId: string
            // in tests, we want each client to have a unique db name
            dbName: string
            unpackEnvelopeOpts?: UnpackEnvelopeOpts
            streamOpts?: { useModifySync?: boolean }
        },
    ) {
        this.streamsServiceStore = new StreamsServiceStore({
            dbName: opts.dbName,
            logId: opts.logId,
        })
        this.log = dlog('csb:sync:streamsClient', { defaultEnabled: true }).extend(opts.logId)
        this.logError = dlogError('csb:cl:streamsClient:error').extend(opts.logId)
        this.logDebug = dlog('csb:cl:streamsClient:debug').extend(opts.logId)
    }

    get syncState(): SyncState {
        return this.syncedStreamsLoop?.syncState ?? SyncState.NotSyncing
    }

    get pingInfo(): PingInfo | undefined {
        return this.syncedStreamsLoop?.pingInfo
    }

    get url(): string {
        return this.rpcClient.url
    }

    get rpcOpts(): StreamRpcClientOptions {
        return this.rpcClient.opts
    }

    async openDb() {
        await this.streamsServiceStore.open()
    }

    async stop() {
        await this.syncedStreamsLoop?.stop()
        this.syncedStreamsLoop = undefined
    }

    stats() {
        return this.syncedStreamsLoop?.stats()
    }

    getSyncId(): string | undefined {
        return this.syncedStreamsLoop?.getSyncId()
    }

    setHighPriorityStreams(streamIds: string[]) {
        this.highPriorityIds = new Set(streamIds)
        this.syncedStreamsLoop?.setHighPriorityStreams(streamIds)
    }

    onNetworkStatusChanged(isOnline: boolean) {
        this.log('network status changed. Network online?', isOnline)
        this.syncedStreamsLoop?.onNetworkStatusChanged(isOnline)
    }

    manifest(streamId: string): StreamManifest | undefined {
        return this.manifests[streamId]
    }

    async createStream(request: PlainMessage<CreateStreamRequest>) {
        check(
            !isMediaStreamId(request.streamId),
            'media streams should be created with createMediaStream',
        )
        let response: CreateStreamResponse | GetStreamResponse = await this.rpcClient.createStream(
            request,
        )
        if (!response.stream) {
            // if a stream alread exists it will return a nil stream in the response, but no error
            // fetch the stream to get the client in the rigth state
            // it is expensive to call createStream on the node, so don't depend on this
            // code path for streams you know exist
            response = await this.rpcClient.getStream({
                streamId: request.streamId,
            })
        }
        const streamIdStr = streamIdAsString(request.streamId)
        const unpacked = await unpackStream(response.stream, this.opts.unpackEnvelopeOpts)
        const loadedStream = toLoadedStreamFromResponse(streamIdStr, unpacked)
        await this.saveLoadedStream(loadedStream)
        return loadedStream
    }

    async createMediaStream(request: PlainMessage<CreateMediaStreamRequest>) {
        check(
            isMediaStreamId(request.streamId),
            'only media streams should be created with createMediaStream',
        )
        return this.rpcClient.createMediaStream(request)
    }

    async addMediaEvent(request: MessageInitShape<typeof AddMediaEventRequestSchema>) {
        return this.rpcClient.addMediaEvent(request)
    }

    /// load stream from persistence
    async loadStream(streamId: string) {
        const loadedStreamBytes = await this.streamsServiceStore.loadStream(streamId)
        if (!loadedStreamBytes) {
            return undefined
        }
        const loadedStream = await toLoadedStream(loadedStreamBytes)
        this.manifests[streamId] = loadedStream.manifest
        return loadedStream
    }

    async loadStreams(streamIds: string[]) {
        const now = performance.now()
        const loadedStreamsBytes = await this.streamsServiceStore.loadStreams(streamIds)
        const t1 = performance.now()
        this.log('####Performance: loaded streams from store!!', t1 - now)
        const loadedStreams: LoadedStream2[] = []
        for (const x of loadedStreamsBytes) {
            const loadedStream = await toLoadedStream(x)
            loadedStreams.push(loadedStream)
        }
        // const loadedStreams = await Promise.all(
        //     loadedStreamsBytes.map((x) => toLoadedStream(x, localUnpackEnvelopeOpts)),
        // )
        const t2 = performance.now()
        this.log('####Performance: loaded toLoadedStream!!', t2 - t1)
        return loadedStreams.reduce((acc, x) => {
            if (x) {
                acc[x.streamId] = x
                this.manifests[x.streamId] = x.manifest
            }
            return acc
        }, {} as Record<string, LoadedStream2>)
    }

    async getMiniblockInfo(
        streamId: string,
    ): Promise<{ miniblockNum: bigint; miniblockHash: Uint8Array }> {
        const manifest = this.manifests[streamId]
        if (manifest) {
            return {
                miniblockNum: manifest.syncCookie.minipoolGen - 1n,
                miniblockHash: manifest.syncCookie.prevMiniblockHash,
            }
        }
        const response = await this.rpcClient.getLastMiniblockHash({
            streamId: streamIdAsBytes(streamId),
        })
        return {
            miniblockNum: response.miniblockNum,
            miniblockHash: response.hash,
        }
    }

    /// fetch latest from remote
    private async _getStream(streamId: string, opts?: { skipCache?: boolean; optional?: boolean }) {
        const streamIdStr = streamIdAsString(streamId)
        // todo - we can pull the sync cookie out of the cache for get stream responses and apply deltas
        const response = await this.rpcClient.getStream({
            streamId: streamIdAsBytes(streamId),
            syncCookie: undefined,
            optional: opts?.optional,
        })
        if (opts?.optional && !response.stream) {
            return undefined
        }
        const unpacked = await unpackStream(response.stream, this.opts.unpackEnvelopeOpts)
        const loadedStream = toLoadedStreamFromResponse(streamIdStr, unpacked) // todo - toStreamModel
        if (!opts?.skipCache) {
            await this.saveLoadedStream(loadedStream)
        }
        return loadedStream
    }

    async getStream(
        streamId: string | Uint8Array,
        opts?: { skipCache?: boolean; optional?: boolean },
    ): Promise<LoadedStream2> {
        const streamIdStr = streamIdAsString(streamId)
        const loadedStream = await this._getStream(streamIdStr, opts)
        check(isDefined(loadedStream), 'bad stream')
        console.log('syn####getStream', streamIdStr, loadedStream.manifest.miniblockSpan)
        return loadedStream
    }

    getOptionalStream(
        streamId: string | Uint8Array,
        opts?: { skipCache?: boolean },
    ): Promise<LoadedStream2 | undefined> {
        const streamIdStr = streamIdAsString(streamId)
        return this._getStream(streamIdStr, { ...opts, optional: true })
    }

    /// in case you want to handle streaming yourself, otherwise use getStreamEx
    getStreamExRaw(
        request: MessageInitShape<typeof GetStreamExRequestSchema>,
        options?: CallOptions,
    ) {
        return this.rpcClient.getStreamEx(request, options)
    }

    /// getStreamEx - returns a stream of miniblocks does not do any caching
    async getStreamEx(streamId: string | Uint8Array) {
        const response = this.rpcClient.getStreamEx({
            streamId: streamIdAsBytes(streamId),
        })
        const miniblocks: Miniblock[] = []
        let seenEndOfStream = false
        for await (const chunk of response) {
            switch (chunk.data.case) {
                case 'miniblock':
                    if (seenEndOfStream) {
                        throw new Error(
                            `GetStreamEx: received miniblock after minipool contents for stream ${streamIdAsString(
                                streamId,
                            )}.`,
                        )
                    }
                    miniblocks.push(chunk.data.value)
                    break
                case 'minipool':
                    // TODO: add minipool contents to the unpacked response
                    break
                case undefined:
                    seenEndOfStream = true
                    break
            }
        }
        if (!seenEndOfStream) {
            throw new Error(
                `Failed receive all getStreamEx streaming responses for stream ${streamIdAsString(
                    streamId,
                )}.`,
            )
        }
        const unpackedResponse = await unpackStreamEx(miniblocks, this.opts?.unpackEnvelopeOpts)
        const loadedStream = toLoadedStreamFromResponse(
            streamIdAsString(streamId),
            unpackedResponse,
        )
        return loadedStream
    }

    // load or fetch stream and start syncing
    syncStream(view: SyncedStream, syncCookie: SyncCookie) {
        // todo view will be replaced with a global TownsData delegate
        // todo should only need to pass in streamId
        // todo we can probably just start the syncedStreamsLoop when the first stream is added to sync
        if (!this.syncedStreamsLoop) {
            return
        }
        this.log('addStreamToSync', view.streamId)
        const streamStub = this.makeStreamStub(view)
        this.syncedStreamsLoop.addStreamToSync(view.streamId, syncCookie, streamStub)
    }

    startSyncStreams(streams: SyncedStream[]) {
        check(!isDefined(this.syncedStreamsLoop), 'syncedStreamsLoop is already started')
        const streamRecords = Array.from(streams?.values() ?? [])
            .filter((x) => isDefined(x.syncCookie))
            .map((stream) => ({
                syncCookie: stream.syncCookie!,
                stream: this.makeStreamStub(stream),
            }))
        this.tryStartSyncStreams(streamRecords)
    }

    async removeStreamFromSync(streamId: string) {
        if (!this.syncedStreamsLoop) {
            return
        }
        await this.syncedStreamsLoop.removeStreamFromSync(streamId)
        // todo cleanup state
    }

    async scrollback(
        stream: SyncedStream,
    ): Promise<{ terminus: boolean; firstEvent?: StreamTimelineEvent }> {
        // todo this stream isn't properly linked to the manifest,
        check(isDefined(this.manifests[stream.streamId]), 'manifest not found')
        const manifest = this.manifests[stream.streamId]
        if (manifest.terminus || manifest.miniblockSpan.fromInclusive === 0n) {
            this.log(
                'scrollback: terminus or zero',
                stream.streamId,
                manifest.terminus,
                manifest.miniblockSpan,
            )
            return { terminus: true, firstEvent: stream.view.timeline.at(0) }
        }
        // look for events in the persistence store for this current manifest

        const nextEventsRecord = manifest.nextEventsRecordId
            ? await this.streamsServiceStore.getEvents(manifest.nextEventsRecordId)
            : undefined

        if (
            nextEventsRecord &&
            manifest.miniblockSpan.fromInclusive <= nextEventsRecord.miniblockSpan.toExclusive
        ) {
            this.log(`scrollback: span and gap ${stream.streamId}`, nextEventsRecord.id)

            const loadedResult = getConfirmedEventsFromRecord(nextEventsRecord, {
                fromInclusive: nextEventsRecord.miniblockSpan.fromInclusive,
                toExclusive: manifest.miniblockSpan.fromInclusive,
            })
            let events: ConfirmedEvent[] = []
            try {
                events = await Promise.all(
                    loadedResult.map(async (x) => {
                        const event = await toConfirmedEvent(x, localUnpackEnvelopeOpts)
                        return event
                    }),
                )
            } catch (e) {
                console.error(
                    'syn####_events: error loading events!!',
                    e,
                    stream.streamId,
                    loadedResult,
                )
                throw e // todo handle this error
            }

            const cleartexts = await this.persistenceStore.getCleartexts(
                events.map((x) => x.event.hashStr),
            )
            stream.prependConfirmedEvents(
                nextEventsRecord.miniblockSpan,
                events,
                cleartexts,
                nextEventsRecord.terminus === true,
            )
            // update the manifest to include the persisted events
            console.log(
                'syn####scrollback: update manifest',
                stream.streamId,
                manifest.currentEventsRecordId,
                nextEventsRecord.id,
            )
            manifest.miniblockSpan.fromInclusive = nextEventsRecord.miniblockSpan.fromInclusive
            manifest.currentEventsRecordId = nextEventsRecord.id
            manifest.nextEventsRecordId = nextEventsRecord.nextId
            return {
                terminus: nextEventsRecord.terminus === true,
                firstEvent: stream.view.timeline.at(0),
            }
        }

        if (
            nextEventsRecord &&
            manifest.miniblockSpan.fromInclusive < nextEventsRecord?.miniblockSpan.toExclusive
        ) {
            // todo handle this error
            throw new Error(
                `scrollback: gap ${stream.streamId} ${nextEventsRecord.id} ${manifest.miniblockSpan.fromInclusive} < ${nextEventsRecord?.miniblockSpan.toExclusive}`,
            )
        }

        const currentEventsRecord = await this.streamsServiceStore.getEvents(
            manifest.currentEventsRecordId,
        )
        check(isDefined(currentEventsRecord), `current events record not found ${stream.streamId}`)
        check(
            currentEventsRecord.miniblockSpan.fromInclusive ===
                manifest.miniblockSpan.fromInclusive,
            `current events record span mismatch ${stream.streamId}`,
        )

        // calculate the gap
        const gap = {
            fromInclusive: nextEventsRecord?.miniblockSpan.toExclusive ?? 0n,
            toExclusive: manifest.miniblockSpan.fromInclusive,
        }

        // we don't want to load too many, but also not too few
        const miniblockSpan = {
            fromInclusive:
                gap.toExclusive - gap.fromInclusive > 100n
                    ? gap.toExclusive - 100n
                    : gap.fromInclusive,
            toExclusive: gap.toExclusive,
        }
        const { miniblocks, terminus } = await this.getMiniblocks(
            stream.streamId,
            miniblockSpan.fromInclusive,
            miniblockSpan.toExclusive,
        )
        const timelineEvents: ConfirmedEvent[] = miniblocks.flatMap((block) =>
            block.events
                .map((event, index) => toNewlyConfirmedEvent(block.header, event, index))
                .filter(isTimelineEvent),
        )
        const cleartexts = await this.persistenceStore.getCleartexts(
            timelineEvents.map((x) => x.event.hashStr),
        )
        stream.prependConfirmedEvents(miniblockSpan, timelineEvents, cleartexts, terminus)

        const newEventsRecords = prependEventsToRecord({
            eventsRecord: currentEventsRecord,
            timelineEvents: timelineEvents.map(toConfirmedEventBytes),
            miniblockSpan,
            terminus,
        })
        check(newEventsRecords.length > 0, `no new events records ${stream.streamId}`)
        await this.streamsServiceStore.bulkPutEvents(newEventsRecords)

        // update the manifest to include the persisted events
        manifest.miniblockSpan.fromInclusive = miniblockSpan.fromInclusive
        manifest.currentEventsRecordId = newEventsRecords.at(-1)!.id
        manifest.nextEventsRecordId = newEventsRecords.at(-1)!.nextId
        manifest.terminus = terminus

        return { terminus: terminus, firstEvent: stream.view.timeline.at(0) }
    }

    /// getMiniblocks - does not do any caching, to cache use scrollback
    async getMiniblocks(
        streamId: string | Uint8Array,
        fromInclusive: bigint,
        toExclusive: bigint,
    ): Promise<{ miniblocks: ParsedMiniblock[]; terminus: boolean }> {
        const { miniblocks, terminus } = await getMiniblocks(
            this.rpcClient,
            streamId,
            fromInclusive,
            toExclusive,
            this.opts?.unpackEnvelopeOpts,
        )

        return {
            terminus,
            miniblocks,
        }
    }

    async getLastMiniblockHash(
        streamId: string | Uint8Array,
        options?: CallOptions,
    ): Promise<Uint8Array> {
        const r = await this.rpcClient.getLastMiniblockHash(
            { streamId: streamIdAsBytes(streamId) },
            options,
        )
        return r.hash
    }

    async addEvent(request: MessageInitShape<typeof AddEventRequestSchema>, options?: CallOptions) {
        return this.rpcClient.addEvent(request, options)
    }

    async info(request: MessageInitShape<typeof InfoRequestSchema>, options?: CallOptions) {
        return this.rpcClient.info(request, options)
    }

    private tryStartSyncStreams(streams?: { syncCookie: SyncCookie; stream: ISyncedStream }[]) {
        if (this.syncedStreamsLoop) {
            return
        }

        this.syncedStreamsLoop = new SyncedStreamsLoop(
            this.clientEmitter,
            this.rpcClient,
            streams ?? [],
            this.opts.logId,
            this.opts.unpackEnvelopeOpts,
            this.highPriorityIds,
            this.opts.streamOpts,
        )
        this.syncedStreamsLoop.start()
    }

    private async saveLoadedStream(loadedStream: LoadedStream2) {
        // need to load the head of the events records and update it, or create a new one
        const { streamId, manifest, snapshot, snapshotSignature, timelineEvents } = loadedStream
        const eventsRecord = await this.streamsServiceStore.getEvents(loadedStream.streamId)
        const nextEventsRecord = eventsRecord?.nextId
            ? await this.streamsServiceStore.getEvents(eventsRecord.nextId)
            : undefined
        let eventsRecords: EventsRecord[] = []
        const timelineEventsBytes = timelineEvents
            .filter(isTimelineEvent)
            .map(toConfirmedEventBytes)
        if (!eventsRecord) {
            eventsRecords = [
                {
                    streamId,
                    id: streamId,
                    nextId: undefined,
                    miniblockSpan: { ...manifest.miniblockSpan },
                    timelineEvents: reduceEvents(timelineEventsBytes, manifest.miniblockSpan),
                    terminus: manifest.terminus,
                },
            ]
        } else {
            eventsRecords = appendEventsToRecord({
                eventsRecord,
                nextEventsRecord,
                timelineEvents: timelineEventsBytes,
                miniblockSpan: { ...manifest.miniblockSpan },
            })
        }
        check(eventsRecords.length > 0, `no events records ${streamId}`)
        await this.saveStream(streamId, manifest, eventsRecords, snapshot, snapshotSignature)
        console.log(
            'syn####saveLoadedStream: updateing recordid 1',
            streamId,
            manifest.currentEventsRecordId,
            eventsRecords[0].id,
        )
        manifest.currentEventsRecordId = eventsRecords[0].id
        manifest.nextEventsRecordId = eventsRecords[0].nextId
        if (eventsRecords[0].miniblockSpan.fromInclusive !== manifest.miniblockSpan.fromInclusive) {
            throw new Error(
                `saveLoadedStream: span mismatch ${streamId} ${manifest.miniblockSpan.fromInclusive} !== ${eventsRecords[0].miniblockSpan.fromInclusive}`,
            )
        }
        this.manifests[streamId] = manifest
    }

    private async saveStream(
        streamId: string,
        manifest: StreamManifest,
        eventsRecord?: EventsRecord[],
        snapshot?: Snapshot,
        snapshotSignature?: EventSignatureBundle,
    ) {
        // todo, pull these evelopes from the responses instead of re formatting them
        const minipoolBytes = manifest.minipool
            .filter((e) => isDefined(e.signature))
            .map((e) =>
                create(EnvelopeSchema, {
                    signature: e.signature!,
                    hash: e.hash,
                    event: toBinary(StreamEventSchema, e.event),
                } satisfies PlainMessage<Envelope>),
            )

        const streamCookie = {
            streamId: streamId,
            syncCookie: manifest.syncCookie,
            lastEventNum: manifest.lastEventNum,
            minipoolBytes,
        } satisfies StreamCookieRecord

        await this.streamsServiceStore.putStream({
            streamCookie,
            events: eventsRecord,
            snapshotBytes: snapshot ? toBinary(SnapshotSchema, snapshot) : undefined,
            snapshotSignature: snapshotSignature,
        })
    }

    private async updateStream(
        streamId: string,
        events: ParsedEvent[],
        nextSyncCookie: SyncCookie,
        newSnapshot?: { snapshot: Snapshot; snapshotSignature: EventSignatureBundle },
    ) {
        const manifest = this.manifests[streamId]
        check(isDefined(manifest), `manifest not found ${streamId}`)
        console.log('syn####updateStream', streamId, events.length, manifest.miniblockSpan)
        const minipoolIds = new Set<string>(manifest.minipool.map((e) => e.hashStr))
        const newEvents: ConfirmedEvent[] = []
        const updatedEventRecords: Record<string, EventsRecord> = {}
        for (const event of events) {
            const payload = event.event.payload
            switch (payload.case) {
                case 'miniblockHeader': {
                    console.log(
                        'syn####updateStream: miniblockHeader',
                        streamId,
                        payload.value.miniblockNum,
                        manifest.miniblockSpan,
                    )
                    if (payload.value.miniblockNum != manifest.miniblockSpan.toExclusive) {
                        // todo catch this and re-initialize the stream
                        throw new Error(
                            'miniblock num mismatch ' +
                                streamId +
                                'expected: ' +
                                manifest.miniblockSpan.toExclusive +
                                ' got: ' +
                                payload.value.miniblockNum,
                        )
                    }
                    const { confirmedEvents } = this.onMiniblockHeader(
                        streamId,
                        manifest,
                        payload.value,
                    )
                    const snapshotUpdateFns = confirmedEvents
                        .map((e) => updateSnapshot(e, e.event.hash))
                        .filter(isDefined)

                    if (snapshotUpdateFns.length > 0) {
                        // if we haven't loaded the snapshot yet, load it
                        if (!newSnapshot) {
                            // todo i want to cache these in an lru cache
                            const snapshotBytes = await this.streamsServiceStore.getSnapshot(
                                streamId,
                            )
                            check(isDefined(snapshotBytes), 'snapshot not found')
                            newSnapshot = {
                                snapshot: fromBinary(SnapshotSchema, snapshotBytes.snapshotBytes),
                                snapshotSignature: snapshotBytes.snapshotSignature,
                            }
                        }
                        // apply the updates to the snapshot
                        for (const fn of snapshotUpdateFns) {
                            fn(newSnapshot.snapshot)
                        }
                    }

                    newEvents.push(...confirmedEvents)
                    console.log(
                        'syn####updateStream: NEW miniblockHeader: newEvents',
                        streamId,
                        confirmedEvents.length,
                        payload.value.miniblockNum + 1n,
                    )
                    manifest.miniblockSpan.toExclusive = payload.value.miniblockNum + 1n
                    manifest.lastEventNum =
                        confirmedEvents.at(-1)?.eventNum ?? manifest.lastEventNum // it is technically possible for headers to contain no events
                    const timelineEvents = confirmedEvents.filter(isTimelineEvent)
                    // always update the events record to keep spans in sync
                    // todo follow up: think i also need to add to minipool...
                    const eventsRecord =
                        updatedEventRecords[streamId] ??
                        (await this.streamsServiceStore.getEvents(streamId))
                    check(isDefined(eventsRecord), 'events record not found')
                    const nextEventsRecord = eventsRecord.nextId
                        ? await this.streamsServiceStore.getEvents(eventsRecord.nextId)
                        : undefined

                    const newlyUpdatedEventRecords = appendEventsToRecord({
                        eventsRecord,
                        nextEventsRecord,
                        timelineEvents: timelineEvents.map(toConfirmedEventBytes),
                        miniblockSpan: {
                            fromInclusive: payload.value.miniblockNum,
                            toExclusive: payload.value.miniblockNum + 1n,
                        },
                    })
                    newlyUpdatedEventRecords.forEach((x) => {
                        updatedEventRecords[x.id] = x
                    })
                    break
                }
                default:
                    if (!minipoolIds.has(event.hashStr)) {
                        manifest.minipool.push(event)
                        minipoolIds.add(event.hashStr)
                    }
                    break
            }
        }
        manifest.syncCookie = nextSyncCookie
        const timelineEvents = newEvents.filter(isTimelineEvent)

        await this.saveStream(
            streamId,
            manifest,
            Object.values(updatedEventRecords),
            newSnapshot?.snapshot,
            newSnapshot?.snapshotSignature,
        )

        return { confirmedEvents: newEvents, timelineEvents, snapshot: newSnapshot?.snapshot }
    }

    private onMiniblockHeader(
        streamId: string,
        manifest: StreamManifest,
        miniblockHeader: MiniblockHeader,
    ): {
        confirmedEvents: ConfirmedEvent[]
    } {
        this.logDebug(
            'Received miniblock header',
            miniblockHeader.miniblockNum.toString(),
            `eventHashesCount: ${miniblockHeader.eventHashes.length}`,
            streamId,
        )

        const eventHashes = miniblockHeader.eventHashes.map(bin_toHexString)
        const eventIndexes = eventHashes
            .map((hash) => manifest.minipool.findIndex((e) => e.hashStr === hash))
            .filter((x) => x !== -1)
            .sort((a, b) => b - a) // sort in descending order

        if (eventIndexes.length !== eventHashes.length) {
            throw new Error("Couldn't find event for hash in miniblock")
        }

        const events = eventIndexes.map((index) => {
            const event = manifest.minipool.splice(index, 1)[0]
            if (!event) {
                throw new Error('event not found')
            }
            return toNewlyConfirmedEvent(miniblockHeader, event, index)
        })

        // reverse back to get them in the right order
        events.reverse()

        return {
            confirmedEvents: events,
        }
    }

    private makeStreamStub(view: SyncedStream): ISyncedStream {
        const streamStub: ISyncedStream = {
            streamId: view.streamId,
            stop: () => {
                view.stop()
            },
            reInitialize: async (resp) => {
                console.log('syn####reInitialize', view.streamId)
                const manifest = this.manifests[view.streamId]
                check(isDefined(manifest), `manifest not found ${view.streamId}`)
                const loadedStream = toLoadedStreamFromResponse(view.streamId, resp)
                await view.initializeFromResponse(loadedStream)
                await this.saveLoadedStream(loadedStream)
            },
            appendEvents: async (events, nextSyncCookie, cleartexts) => {
                await view.appendEvents(events, nextSyncCookie, cleartexts)
                try {
                    const result = await this.updateStream(view.streamId, events, nextSyncCookie)
                    console.log(
                        'syn####appendEvents: result',
                        view.streamId,
                        result.confirmedEvents.length,
                        result.timelineEvents.length,
                    )
                    //await view.
                } catch (error) {
                    this.logError('error updating stream', error)
                    // TODO HANDLE THIS THROW, DELETE AND RE-INITIALIZE STREAM
                }
            },
            resetUpToDate: () => {
                view.resetUpToDate()
            },
        }
        return streamStub
    }
}

async function toLoadedStream(streamBytes: LoadedStreamBytes): Promise<LoadedStream2> {
    const minipool = await Promise.all(
        streamBytes.streamCookie.minipoolBytes.map((x) =>
            unpackEnvelope(x, localUnpackEnvelopeOpts),
        ),
    )
    const timelineEventsBytes = getConfirmedEventsFromRecord(
        streamBytes.events,
        streamBytes.events.miniblockSpan,
    )
    const timelineEvents = await Promise.all(
        timelineEventsBytes.map(async (x) => {
            const event = await toConfirmedEvent(x, localUnpackEnvelopeOpts)
            return event
        }),
    )
    const snapshot = fromBinary(SnapshotSchema, streamBytes.snapshot.snapshotBytes)
    /// we want to drop the minipoolBytes from the manifest and add the minipool
    const manifest = {
        streamId: streamBytes.streamCookie.streamId,
        syncCookie: streamBytes.streamCookie.syncCookie,
        lastEventNum: streamBytes.streamCookie.lastEventNum,
        minipool,
        miniblockSpan: { ...streamBytes.events.miniblockSpan },
        currentEventsRecordId: streamBytes.events.id,
        nextEventsRecordId: streamBytes.events.nextId,
        terminus: streamBytes.events.terminus,
    } satisfies StreamManifest
    return {
        streamId: streamBytes.streamCookie.streamId,
        manifest,
        timelineEvents,
        snapshot,
        snapshotSignature: streamBytes.snapshot.snapshotSignature,
    }
}

// toLoadedStreamFromResponse - fastforwards the snapshot and seperates out timeine events
export function toLoadedStreamFromResponse(
    streamId: string,
    stream: ParsedStreamResponse,
): LoadedStream2 {
    // todo collapse blocs
    check(stream.streamAndCookie.miniblocks.length > 0, `Stream ${streamId} is empty`)
    const miniblocks = stream.streamAndCookie.miniblocks
    const miniblockHeaderEvent = miniblocks[0].events.at(-1)
    check(
        isDefined(miniblockHeaderEvent),
        `Miniblock header event not found ${streamId}`,
        Err.STREAM_EMPTY,
    )
    const snapshotSignature = getEventSignature(miniblockHeaderEvent)
    const fromInclusive = miniblocks[0].header.miniblockNum
    const toExclusive = stream.streamAndCookie.nextSyncCookie.minipoolGen
    const minipool = stream.streamAndCookie.events
    const snapshot = clone(SnapshotSchema, stream.snapshot) // clone since we're going to mutate it
    const timelineEvents: ConfirmedEvent[] = []
    // walk all the blocks, advance snapshot, and collect timeline events
    miniblocks.forEach((block, mbIndex) => {
        block.events.forEach((event, eventIndex) => {
            const confirmedEvent = toNewlyConfirmedEvent(block.header, event, eventIndex)
            // the first block is included in the snapshot
            if (mbIndex > 0) {
                // if this modifies the snapshot, update it
                const updateSnapshotFn = updateSnapshot(confirmedEvent, event.hash)
                updateSnapshotFn?.(snapshot)
            }
            // if this is a timeline event, add it to the timeline
            if (isTimelineEvent(confirmedEvent)) {
                timelineEvents.push(confirmedEvent)
            }
        })
    })
    const lastBlock = miniblocks[miniblocks.length - 1]
    const lastEventNum = lastBlock.header.eventNumOffset + BigInt(lastBlock.events.length)

    const miniblockSpan = {
        fromInclusive,
        toExclusive,
    }

    const manifest = {
        streamId,
        syncCookie: stream.streamAndCookie.nextSyncCookie,
        lastEventNum,
        minipool,
        miniblockSpan: miniblockSpan,
        currentEventsRecordId: streamId,
        nextEventsRecordId: undefined,
        terminus: miniblockSpan.fromInclusive === 0n,
    } satisfies StreamManifest

    return {
        streamId,
        manifest,
        timelineEvents,
        snapshot,
        snapshotSignature,
    }
}

function isTimelineEvent(event: ConfirmedEvent) {
    // todo - this should go off the renderable event conversion
    return isPersistedEvent(event.event, 'backward')
}

function toNewlyConfirmedEvent(
    header: MiniblockHeader,
    event: ParsedEvent,
    index: number,
): ConfirmedEvent {
    return {
        event,
        eventNum: header.eventNumOffset + BigInt(index),
        miniblockNum: header.miniblockNum,
    }
}
