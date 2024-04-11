import { PlainMessage } from '@bufbuild/protobuf'
import { bin_equal, bin_fromHexString, bin_toHexString, check } from '@river-build/dlog'
import { isDefined, assert, hasElements } from './check'
import {
    Envelope,
    EventRef,
    StreamEvent,
    Err,
    Miniblock,
    StreamAndCookie,
    SyncCookie,
} from '@river-build/proto'
import { assertBytes } from 'ethereum-cryptography/utils'
import { recoverPublicKey, signSync, verify } from 'ethereum-cryptography/secp256k1'
import { genIdBlob, streamIdAsBytes, streamIdAsString, userIdFromAddress } from './id'
import { ParsedEvent, ParsedMiniblock, ParsedStreamAndCookie, ParsedStreamResponse } from './types'
import { SignerContext, checkDelegateSig } from './signerContext'
import { keccak256 } from 'ethereum-cryptography/keccak'

export const _impl_makeEvent_impl_ = async (
    context: SignerContext,
    payload: PlainMessage<StreamEvent>['payload'],
    prevMiniblockHash?: Uint8Array,
): Promise<Envelope> => {
    const streamEvent = new StreamEvent({
        creatorAddress: context.creatorAddress,
        salt: genIdBlob(),
        prevMiniblockHash,
        payload,
        createdAtEpochMs: BigInt(Date.now()),
    })
    if (context.delegateSig !== undefined) {
        streamEvent.delegateSig = context.delegateSig
        streamEvent.delegateExpiryEpochMs = context.delegateExpiryEpochMs ?? 0n
    }

    const event = streamEvent.toBinary()
    const hash = riverHash(event)
    const signature = await riverSign(hash, context.signerPrivateKey())

    return new Envelope({ hash, signature, event })
}

export const makeEvent = async (
    context: SignerContext,
    payload: PlainMessage<StreamEvent>['payload'],
    prevMiniblockHash?: Uint8Array,
): Promise<Envelope> => {
    // const pl: Payload = payload instanceof Payload ? payload : new Payload(payload)
    const pl = payload // todo check this
    check(isDefined(pl), "Payload can't be undefined", Err.BAD_PAYLOAD)
    check(isDefined(pl.case), "Payload can't be empty", Err.BAD_PAYLOAD)
    check(isDefined(pl.value), "Payload value can't be empty", Err.BAD_PAYLOAD)
    check(isDefined(pl.value.content), "Payload content can't be empty", Err.BAD_PAYLOAD)
    check(isDefined(pl.value.content.case), "Payload content case can't be empty", Err.BAD_PAYLOAD)

    if (prevMiniblockHash) {
        check(
            prevMiniblockHash.length === 32,
            `prevMiniblockHash should be 32 bytes, got ${prevMiniblockHash.length}`,
            Err.BAD_HASH_FORMAT,
        )
    }

    return _impl_makeEvent_impl_(context, pl, prevMiniblockHash)
}

export const makeEvents = async (
    context: SignerContext,
    payloads: PlainMessage<StreamEvent>['payload'][],
    prevMiniblockHash?: Uint8Array,
): Promise<Envelope[]> => {
    const events: Envelope[] = []
    for (const payload of payloads) {
        const event = await makeEvent(context, payload, prevMiniblockHash)
        events.push(event)
    }
    return events
}

export const unpackStream = async (stream?: StreamAndCookie): Promise<ParsedStreamResponse> => {
    assert(stream !== undefined, 'bad stream')
    const streamAndCookie = await unpackStreamAndCookie(stream)
    assert(
        stream.miniblocks.length > 0,
        `bad stream: no blocks ${streamIdAsString(streamAndCookie.nextSyncCookie.streamId)}`,
    )

    const snapshot = streamAndCookie.miniblocks[0].header.snapshot
    const prevSnapshotMiniblockNum = streamAndCookie.miniblocks[0].header.prevSnapshotMiniblockNum
    assert(
        snapshot !== undefined,
        `bad block: snapshot is undefined ${streamIdAsString(
            streamAndCookie.nextSyncCookie.streamId,
        )}`,
    )
    const eventIds = [
        ...streamAndCookie.miniblocks.flatMap(
            (mb) => mb.events.map((e) => e.hashStr),
            streamAndCookie.events.map((e) => e.hashStr),
        ),
    ]

    return {
        streamAndCookie,
        snapshot,
        prevSnapshotMiniblockNum,
        eventIds,
    }
}

export const unpackStreamEx = async (miniblocks: Miniblock[]): Promise<ParsedStreamResponse> => {
    const streamAndCookie: StreamAndCookie = new StreamAndCookie()
    streamAndCookie.events = []
    streamAndCookie.miniblocks = miniblocks
    // We don't need to set a valid nextSyncCookie here, as we are currently using getStreamEx only
    // for fetching media streams, and the result does not return a nextSyncCookie. However, it does
    // need to be non-null to avoid runtime errors when unpacking the stream into a StreamStateView,
    // which parses content by type.
    streamAndCookie.nextSyncCookie = new SyncCookie()
    return unpackStream(streamAndCookie)
}

export const unpackStreamAndCookie = async (
    streamAndCookie: StreamAndCookie,
): Promise<ParsedStreamAndCookie> => {
    assert(streamAndCookie.nextSyncCookie !== undefined, 'bad stream: no cookie')
    const miniblocks = await Promise.all(
        streamAndCookie.miniblocks.map(async (mb) => await unpackMiniblock(mb)),
    )
    return {
        events: await unpackEnvelopes(streamAndCookie.events),
        nextSyncCookie: streamAndCookie.nextSyncCookie,
        miniblocks: miniblocks,
    }
}

// returns all events + the header event and pointer to header content
export const unpackMiniblock = async (
    miniblock: Miniblock,
    opts?: { disableChecks: boolean },
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
    }
}

export const unpackEnvelope = async (
    envelope: Envelope,
    opts?: { disableChecks: boolean },
): Promise<ParsedEvent> => {
    check(hasElements(envelope.event), 'Event base is not set', Err.BAD_EVENT)
    check(hasElements(envelope.hash), 'Event hash is not set', Err.BAD_EVENT)
    check(hasElements(envelope.signature), 'Event signature is not set', Err.BAD_EVENT)

    const event = StreamEvent.fromBinary(envelope.event)

    const runChecks = opts?.disableChecks !== true
    if (runChecks) {
        const hash = riverHash(envelope.event)
        check(bin_equal(hash, envelope.hash), 'Event id is not valid', Err.BAD_EVENT_ID)

        const recoveredPubKey = riverRecoverPubKey(hash, envelope.signature)

        if (!hasElements(event.delegateSig)) {
            const address = publicKeyToAddress(recoveredPubKey)
            check(
                bin_equal(address, event.creatorAddress),
                'Event signature is not valid',
                Err.BAD_EVENT_SIGNATURE,
            )
        } else {
            checkDelegateSig({
                delegatePubKey: recoveredPubKey,
                creatorAddress: event.creatorAddress,
                delegateSig: event.delegateSig,
                expiryEpochMs: event.delegateExpiryEpochMs,
            })
        }

        if (event.prevMiniblockHash) {
            // TODO replace with a proper check
            // check(
            //     bin_equal(e.prevEvents[0], prevEventHash),
            //     'prevEvents[0] is not valid',
            //     Err.BAD_PREV_EVENTS,
            // )
        }
    }

    return {
        event,
        hash: envelope.hash,
        hashStr: bin_toHexString(envelope.hash),
        prevMiniblockHashStr: event.prevMiniblockHash
            ? bin_toHexString(event.prevMiniblockHash)
            : undefined,
        creatorUserId: userIdFromAddress(event.creatorAddress),
    }
}

export const unpackEnvelopes = async (
    event: Envelope[],
    opts?: { disableChecks: boolean },
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
export const unpackStreamEnvelopes = async (stream: StreamAndCookie): Promise<ParsedEvent[]> => {
    const ret: ParsedEvent[] = []

    for (const mb of stream.miniblocks) {
        ret.push(...(await unpackEnvelopes(mb.events)))
        ret.push(await unpackEnvelope(mb.header!))
    }

    ret.push(...(await unpackEnvelopes(stream.events)))
    return ret
}

export const makeEventRef = (streamId: string | Uint8Array, event: Envelope): EventRef => {
    return new EventRef({
        streamId: streamIdAsBytes(streamId),
        hash: event.hash,
        signature: event.signature,
    })
}

// Create hash header as Uint8Array from string 'CSBLANCA'
const HASH_HEADER = new Uint8Array([67, 83, 66, 76, 65, 78, 67, 65])
// Create hash separator as Uint8Array from string 'ABCDEFG>'
const HASH_SEPARATOR = new Uint8Array([65, 66, 67, 68, 69, 70, 71, 62])
// Create hash footer as Uint8Array from string '<GFEDCBA'
const HASH_FOOTER = new Uint8Array([60, 71, 70, 69, 68, 67, 66, 65])
// Header for delegate signature 'RIVERSIG'
const RIVER_SIG_HEADER = new Uint8Array([82, 73, 86, 69, 82, 83, 73, 71])

function numberToUint8Array64LE(num: number): Uint8Array {
    const result = new Uint8Array(8)
    for (let i = 0; num != 0; i++, num = num >>> 8) {
        result[i] = num & 0xff
    }
    return result
}

function bigintToUint8Array64LE(num: bigint): Uint8Array {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setBigInt64(0, num, true) // true for little endian
    return new Uint8Array(buffer)
}

function pushByteToUint8Array(arr: Uint8Array, byte: number): Uint8Array {
    const ret = new Uint8Array(arr.length + 1)
    ret.set(arr)
    ret[arr.length] = byte
    return ret
}

function checkSignature(signature: Uint8Array) {
    assertBytes(signature, 65)
}

function checkHash(hash: Uint8Array) {
    assertBytes(hash, 32)
}

export function riverHash(data: Uint8Array): Uint8Array {
    assertBytes(data)
    const hasher = keccak256.create()
    hasher.update(HASH_HEADER)
    hasher.update(numberToUint8Array64LE(data.length))
    hasher.update(HASH_SEPARATOR)
    hasher.update(data)
    hasher.update(HASH_FOOTER)
    return hasher.digest()
}

export function riverDelegateHashSrc(
    devicePublicKey: Uint8Array,
    expiryEpochMs: bigint,
): Uint8Array {
    assertBytes(devicePublicKey)
    check(expiryEpochMs >= 0, 'Expiry should be positive')
    check(devicePublicKey.length === 64 || devicePublicKey.length === 65, 'Bad public key')
    const expiryBytes = bigintToUint8Array64LE(expiryEpochMs)
    const retVal = new Uint8Array(
        RIVER_SIG_HEADER.length + devicePublicKey.length + expiryBytes.length,
    )
    retVal.set(RIVER_SIG_HEADER)
    retVal.set(devicePublicKey, RIVER_SIG_HEADER.length)
    retVal.set(expiryBytes, RIVER_SIG_HEADER.length + devicePublicKey.length)
    return retVal
}

export async function riverSign(
    hash: Uint8Array,
    privateKey: Uint8Array | string,
): Promise<Uint8Array> {
    checkHash(hash)
    // TODO(HNT-1380): why async sign doesn't work in node? Use async sign in the browser, sync sign in node?
    const [sig, recovery] = signSync(hash, privateKey, { recovered: true, der: false })
    return pushByteToUint8Array(sig, recovery)
}

export function riverVerifySignature(
    hash: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array | string,
): boolean {
    checkHash(hash)
    checkSignature(signature)
    return verify(signature.slice(0, 64), hash, publicKey)
}

export function riverRecoverPubKey(hash: Uint8Array, signature: Uint8Array): Uint8Array {
    checkHash(hash)
    checkSignature(signature)
    return recoverPublicKey(hash, signature.slice(0, 64), signature[64])
}

export function publicKeyToAddress(publicKey: Uint8Array): Uint8Array {
    assertBytes(publicKey, 64, 65)
    if (publicKey.length === 65) {
        publicKey = publicKey.slice(1)
    }
    return keccak256(publicKey).slice(-20)
}

export function publicKeyToUint8Array(publicKey: string): Uint8Array {
    // Uncompressed public key in string form should start with '0x04'.
    check(
        typeof publicKey === 'string' && publicKey.startsWith('0x04') && publicKey.length === 132,
        'Bad public key',
        Err.BAD_PUBLIC_KEY,
    )
    return bin_fromHexString(publicKey)
}
