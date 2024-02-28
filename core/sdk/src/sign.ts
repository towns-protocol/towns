import { PlainMessage } from '@bufbuild/protobuf'
import { bin_equal, bin_fromHexString, bin_toHexString, check } from '@river/dlog'
import { isDefined, assert, hasElements } from './check'
import { Envelope, EventRef, StreamEvent, Err, Miniblock, StreamAndCookie } from '@river/proto'
import {
    townsHash,
    townsRecoverPubKey,
    townsSign,
    publicKeyToAddress,
    publicKeyToUint8Array,
} from '@river/encryption'
import { genIdBlob, userIdFromAddress } from './id'
import { ParsedEvent, ParsedMiniblock, ParsedStreamAndCookie, ParsedStreamResponse } from './types'
import { ecrecover, fromRpcSig, hashPersonalMessage } from '@ethereumjs/util'

/**
 * SignerContext is a context used for signing events.
 *
 * Two different scenarios are supported:
 *
 * 1. Signing is delegeted from the user key to the device key, and events are signed with device key.
 *    In this case, `signerPrivateKey` should return a device private key, and `delegateSig` should be
 *    a signature of the device public key by the user private key.
 *
 * 2. Events are signed with the user key. In this case, `signerPrivateKey` should return a user private key.
 *    `delegateSig` should be undefined.
 *
 * In both scenarios `creatorAddress` should be set to the user address derived from the user public key.
 *
 * @param signerPrivateKey - a function that returns a private key to sign events
 * @param creatorAddress - a creator, i.e. user address derived from the user public key
 * @param delegateSig - an optional delegate signature
 */

export interface SignerContext {
    signerPrivateKey: () => string
    creatorAddress: Uint8Array
    delegateSig?: Uint8Array
}

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
        createdAtEpocMs: BigInt(Date.now()),
    })
    if (context.delegateSig !== undefined) {
        streamEvent.delegateSig = context.delegateSig
    }

    const event = streamEvent.toBinary()
    const hash = townsHash(event)
    const signature = await townsSign(hash, context.signerPrivateKey())

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

// TODO(HNT-1380): remove this function
export const verifyOldDelegateSig = (
    devicePubKey: Uint8Array,
    creatorAddress: Uint8Array,
    delegateSig: Uint8Array,
): boolean => {
    const hashBuffer = hashPersonalMessage(Buffer.from(devicePubKey))
    const { v, r, s } = fromRpcSig('0x' + bin_toHexString(delegateSig))
    const delegatePubKey = ecrecover(hashBuffer, v, r, s)
    const delegateAddress = Uint8Array.from(publicKeyToAddress(delegatePubKey))
    return bin_equal(delegateAddress, creatorAddress)
}

export const checkDelegateSig = (
    devicePubKey: Uint8Array | string,
    creatorAddress: Uint8Array | string,
    delegateSig: Uint8Array,
): void => {
    if (typeof devicePubKey === 'string') {
        devicePubKey = publicKeyToUint8Array(devicePubKey)
    }
    if (typeof creatorAddress === 'string') {
        creatorAddress = bin_fromHexString(creatorAddress)
    }

    if (verifyOldDelegateSig(devicePubKey, creatorAddress, delegateSig)) {
        return
    }

    const hash = townsHash(devicePubKey)

    const recoveredKey = townsRecoverPubKey(hash, delegateSig)
    const recoveredAddress = publicKeyToAddress(recoveredKey)

    check(
        bin_equal(recoveredAddress, creatorAddress),
        'delegateSig does not match creatorAddress',
        Err.BAD_DELEGATE_SIG,
    )
}

export const unpackStream = async (stream?: StreamAndCookie): Promise<ParsedStreamResponse> => {
    assert(stream !== undefined, 'bad stream')
    const streamAndCookie = await unpackStreamAndCookie(stream)
    assert(
        stream.miniblocks.length > 0,
        `bad stream: no blocks ${streamAndCookie.nextSyncCookie.streamId}`,
    )

    const snapshot = streamAndCookie.miniblocks[0].header.snapshot
    const prevSnapshotMiniblockNum = streamAndCookie.miniblocks[0].header.prevSnapshotMiniblockNum
    assert(
        snapshot !== undefined,
        `bad block: snapshot is undefined ${streamAndCookie.nextSyncCookie.streamId}`,
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
export const unpackMiniblock = async (miniblock: Miniblock): Promise<ParsedMiniblock> => {
    check(isDefined(miniblock.header), 'Miniblock header is not set')
    const header = await unpackEnvelope(miniblock.header)
    check(
        header.event.payload.case === 'miniblockHeader',
        `bad miniblock header: wrong case received: ${header.event.payload.case}`,
    )
    const events = await unpackEnvelopes(miniblock.events)
    return {
        hash: miniblock.header.hash,
        header: header.event.payload.value,
        events: [...events, header],
    }
}

export const unpackEnvelope = async (envelope: Envelope): Promise<ParsedEvent> => {
    check(hasElements(envelope.event), 'Event base is not set', Err.BAD_EVENT)
    check(hasElements(envelope.hash), 'Event hash is not set', Err.BAD_EVENT)
    check(hasElements(envelope.signature), 'Event signature is not set', Err.BAD_EVENT)

    const hash = townsHash(envelope.event)
    check(bin_equal(hash, envelope.hash), 'Event id is not valid', Err.BAD_EVENT_ID)

    const recoveredPubKey = townsRecoverPubKey(hash, envelope.signature)

    const event = StreamEvent.fromBinary(envelope.event)
    if (!hasElements(event.delegateSig)) {
        const address = publicKeyToAddress(recoveredPubKey)
        check(
            bin_equal(address, event.creatorAddress),
            'Event signature is not valid',
            Err.BAD_EVENT_SIGNATURE,
        )
    } else {
        checkDelegateSig(recoveredPubKey, event.creatorAddress, event.delegateSig)
    }

    if (event.prevMiniblockHash) {
        // TODO replace with a proper check
        // check(
        //     bin_equal(e.prevEvents[0], prevEventHash),
        //     'prevEvents[0] is not valid',
        //     Err.BAD_PREV_EVENTS,
        // )
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

export const unpackEnvelopes = async (event: Envelope[]): Promise<ParsedEvent[]> => {
    const ret: ParsedEvent[] = []
    //let prevEventHash: Uint8Array | undefined = undefined
    for (const e of event) {
        // TODO: this handling of prevEventHash is not correct,
        // hashes should be checked against all preceding events in the stream.
        ret.push(await unpackEnvelope(e))
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

export const makeEventRef = (streamId: string, event: Envelope): EventRef => {
    return new EventRef({
        streamId,
        hash: event.hash,
        signature: event.signature,
    })
}
