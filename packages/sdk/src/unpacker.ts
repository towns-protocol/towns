import {
    type StreamAndCookie,
    type Miniblock,
    type Envelope,
    Err,
    SnapshotSchema,
    StreamAndCookieSchema,
    StreamEventSchema,
    SyncCookieSchema,
    type MiniblockHeader,
    type StreamEvent,
} from '@towns-protocol/proto'
import {
    checkEventSignature,
    makeParsedEvent,
    makeParsedSnapshot,
    riverHash,
    riverSnapshotHash,
    type UnpackEnvelopeOpts,
} from './sign'
import type {
    ParsedStreamResponse,
    ParsedEvent,
    ParsedMiniblock,
    ParsedStreamAndCookie,
    ParsedSnapshot,
} from './types'
import { fromBinary, create } from '@bufbuild/protobuf'
import { check, bin_equal } from '@towns-protocol/dlog'
import { isDefined, hasElements, assert } from './check'
import { streamIdAsString } from './id'
import { eventIdsFromSnapshot } from './persistenceStore'

export type Unpacker = ReturnType<typeof createUnpacker>

export function createUnpacker() {
    const unpackEnvelope = async (
        envelope: Envelope,
        opts: UnpackEnvelopeOpts | undefined,
    ): Promise<ParsedEvent> => {
        check(hasElements(envelope.event), 'Event base is not set', Err.BAD_EVENT)
        check(hasElements(envelope.hash), 'Event hash is not set', Err.BAD_EVENT)
        check(hasElements(envelope.signature), 'Event signature is not set', Err.BAD_EVENT)

        const event = fromBinary(StreamEventSchema, envelope.event)
        let hash = envelope.hash

        const doCheckEventHash = opts?.disableHashValidation !== true
        if (doCheckEventHash) {
            hash = riverHash(envelope.event)
            check(bin_equal(hash, envelope.hash), 'Event id is not valid', Err.BAD_EVENT_ID)
        }

        const doCheckEventSignature = opts?.disableSignatureValidation !== true
        if (doCheckEventSignature) {
            checkEventSignature(event, hash, envelope.signature)
        }

        return makeParsedEvent(event, envelope.hash, envelope.signature)
    }

    const unpackEnvelopes = async (
        event: Envelope[],
        opts: UnpackEnvelopeOpts | undefined,
    ): Promise<ParsedEvent[]> => {
        const ret: ParsedEvent[] = []
        //let prevEventHash: Uint8Array | undefined = undefined
        for (const e of event) {
            // TODO: this handling of prevEventHash is not correct,
            // hashes should be checked against all preceding events in the stream.
            ret.push(await unpackEnvelope(e, opts))
            //prevEventHash = e.hash!
        }
        return ret
    }

    // First unpacks miniblocks, including header events, then unpacks events from the minipool
    const unpackStreamEnvelopes = async (
        stream: StreamAndCookie,
        opts: UnpackEnvelopeOpts | undefined,
    ): Promise<ParsedEvent[]> => {
        const ret: ParsedEvent[] = []

        for (const mb of stream.miniblocks) {
            ret.push(...(await unpackEnvelopes(mb.events, opts)))
            ret.push(await unpackEnvelope(mb.header!, opts))
        }

        ret.push(...(await unpackEnvelopes(stream.events, opts)))
        return ret
    }

    const unpackStream = async (
        stream: StreamAndCookie | undefined,
        opts: UnpackEnvelopeOpts | undefined,
    ): Promise<ParsedStreamResponse> => {
        assert(stream !== undefined, 'bad stream')
        const streamAndCookie = await unpackStreamAndCookie(stream, opts)
        assert(
            stream.miniblocks.length > 0,
            `bad stream: no blocks ${streamIdAsString(streamAndCookie.nextSyncCookie.streamId)}`,
        )

        let snapshot = streamAndCookie.miniblocks[0].header.snapshot
        if (snapshot === undefined) {
            snapshot = streamAndCookie.snapshot?.snapshot
        }
        assert(
            snapshot !== undefined,
            `bad block: snapshot is undefined ${streamIdAsString(
                streamAndCookie.nextSyncCookie.streamId,
            )}`,
        )
        const prevSnapshotMiniblockNum =
            streamAndCookie.miniblocks[0].header.prevSnapshotMiniblockNum
        const eventIds = [
            ...streamAndCookie.miniblocks.flatMap(
                (mb) => mb.events.map((e) => e.hashStr),
                streamAndCookie.events.map((e) => e.hashStr),
            ),
            ...eventIdsFromSnapshot(snapshot),
        ]

        return {
            streamAndCookie,
            snapshot,
            prevSnapshotMiniblockNum,
            eventIds,
        }
    }

    const unpackStreamEx = async (
        miniblocks: Miniblock[],
        opts: UnpackEnvelopeOpts | undefined,
    ): Promise<ParsedStreamResponse> => {
        const streamAndCookie: StreamAndCookie = create(StreamAndCookieSchema, {})
        streamAndCookie.events = []
        streamAndCookie.miniblocks = miniblocks
        // We don't need to set a valid nextSyncCookie here, as we are currently using getStreamEx only
        // for fetching media streams, and the result does not return a nextSyncCookie. However, it does
        // need to be non-null to avoid runtime errors when unpacking the stream into a StreamStateView,
        // which parses content by type.
        streamAndCookie.nextSyncCookie = create(SyncCookieSchema)
        return unpackStream(streamAndCookie, opts)
    }

    const unpackStreamAndCookie = async (
        streamAndCookie: StreamAndCookie,
        opts: UnpackEnvelopeOpts | undefined,
    ): Promise<ParsedStreamAndCookie> => {
        assert(streamAndCookie.nextSyncCookie !== undefined, 'bad stream: no cookie')
        const miniblocks = await Promise.all(
            streamAndCookie.miniblocks.map(async (mb) => await unpackMiniblock(mb, opts)),
        )
        const events = await unpackEnvelopes(streamAndCookie.events, opts)
        let snapshot: ParsedSnapshot | undefined
        if (streamAndCookie.snapshot) {
            let miniblockHeader: StreamEvent | undefined
            let miniblockHeaderHash: Uint8Array | undefined

            if (miniblocks.length > 0 && miniblocks[0].header.snapshotHash) {
                miniblockHeader = miniblocks[0].events.at(-1)?.event
                miniblockHeaderHash = miniblocks[0].header.snapshotHash
            } else if (events.length > 0) {
                miniblockHeaderHash = (
                    events.find((event) => {
                        return event.event.payload.case === 'miniblockHeader'
                    })?.event.payload.value as MiniblockHeader
                ).snapshotHash
            }

            snapshot = await unpackSnapshot(
                miniblockHeader,
                miniblockHeaderHash,
                streamAndCookie.snapshot,
                opts,
            )
        }

        return {
            events: events,
            nextSyncCookie: streamAndCookie.nextSyncCookie,
            miniblocks: miniblocks,
            snapshot: snapshot,
        }
    }

    // returns all events, the header event, snapshot, and pointer to header content
    const unpackMiniblock = async (
        miniblock: Miniblock,
        opts: UnpackEnvelopeOpts | undefined,
    ): Promise<ParsedMiniblock> => {
        check(isDefined(miniblock.header), 'Miniblock header is not set')
        const header = await unpackEnvelope(miniblock.header, opts)
        check(
            header.event.payload.case === 'miniblockHeader',
            `bad miniblock header: wrong case received: ${header.event.payload.case}`,
        )
        const events = await unpackEnvelopes(miniblock.events, opts)
        return {
            hash: miniblock.header.hash,
            header: header.event.payload.value,
            events: [...events, header],
            partial: miniblock.partial,
        }
    }

    const unpackSnapshot = async (
        miniblockHeader: StreamEvent | undefined,
        miniblockHeaderSnapshotHash: Uint8Array | undefined,
        snapshot: Envelope,
        opts: UnpackEnvelopeOpts | undefined,
    ): Promise<ParsedSnapshot> => {
        check(hasElements(snapshot.event), 'Snapshot base is not set', Err.BAD_EVENT)
        check(hasElements(snapshot.hash), 'Snapshot hash is not set', Err.BAD_EVENT)
        check(hasElements(snapshot.signature), 'Snapshot signature is not set', Err.BAD_EVENT)

        // make sure the given snapshot corresponds to the miniblock
        check(
            isDefined(miniblockHeaderSnapshotHash),
            'Miniblock header snapshot hash is not set',
            Err.BAD_EVENT,
        )
        check(
            bin_equal(miniblockHeaderSnapshotHash, snapshot.hash),
            'Snapshot hash does not match miniblock snapshot hash',
            Err.BAD_EVENT_ID,
        )

        // check snapshot hash
        if (opts?.disableHashValidation !== true) {
            const hash = riverSnapshotHash(snapshot.event)
            check(bin_equal(hash, snapshot.hash), 'Snapshot hash is not valid', Err.BAD_EVENT_ID)
        }

        if (opts?.disableSignatureValidation !== true) {
            // header event contains the creatorAddress of the snapshot.
            check(isDefined(miniblockHeader), 'Miniblock header is not set', Err.BAD_EVENT)
            checkEventSignature(miniblockHeader, snapshot.hash, snapshot.signature)
        }

        return makeParsedSnapshot(
            fromBinary(SnapshotSchema, snapshot.event),
            snapshot.hash,
            snapshot.signature,
        )
    }

    return {
        unpackEnvelope,
        unpackEnvelopes,
        unpackStreamEnvelopes,
        unpackStream,
        unpackStreamEx,
        unpackStreamAndCookie,
        unpackSnapshot,
        unpackMiniblock,
    }
}
