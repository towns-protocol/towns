import { PlainMessage } from '@bufbuild/protobuf'
import { Envelope, EventRef, StreamEvent, Err } from '@towns/proto'
import { check, hasElements, isDefined } from './check'
import {
    townsHash,
    townsRecoverPubKey,
    townsSign,
    publicKeyToAddress,
    publicKeyToUint8Array,
} from './crypto'
import { genIdBlob, userIdFromAddress } from './id'
import {
    bin_equal,
    bin_fromHexString,
    bin_toBase64,
    bin_toHexString,
    ParsedEvent,
    stringify,
} from './types'
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
    deviceId?: string
}

export const normailizeHashes = (
    hashes?: Uint8Array[] | Uint8Array | Map<string, Uint8Array>,
): Uint8Array[] => {
    if (hashes === undefined) {
        return []
    }
    if (hashes instanceof Uint8Array) {
        return [hashes]
    }
    if (Array.isArray(hashes)) {
        return hashes
    }
    return Array.from(hashes.values())
}

export const _impl_makeEvent_impl_ = async (
    context: SignerContext,
    payload: PlainMessage<StreamEvent>['payload'],
    prevEvents: Uint8Array[],
): Promise<Envelope> => {
    const streamEvent = new StreamEvent({
        creatorAddress: context.creatorAddress,
        salt: genIdBlob(),
        prevEvents,
        payload,
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
    prevEventHashes?: Uint8Array[] | Uint8Array | Map<string, Uint8Array>,
): Promise<Envelope> => {
    const hashes = normailizeHashes(prevEventHashes)
    // const pl: Payload = payload instanceof Payload ? payload : new Payload(payload)
    const pl = payload // todo check this
    check(isDefined(pl), "Payload can't be undefined", Err.BAD_PAYLOAD)
    check(isDefined(pl.case), "Payload can't be empty", Err.BAD_PAYLOAD)
    check(isDefined(pl.value), "Payload value can't be empty", Err.BAD_PAYLOAD)
    check(isDefined(pl.value.content), "Payload content can't be empty", Err.BAD_PAYLOAD)
    check(isDefined(pl.value.content.case), "Payload content case can't be empty", Err.BAD_PAYLOAD)

    if (pl.value.content.case !== 'inception') {
        check(hashes.length > 0, 'prevEventHashes should be present', Err.BAD_PREV_EVENTS)

        for (const prevEvent of hashes) {
            check(
                prevEvent.length === 32,
                'prevEventHashes should be 32 bytes',
                Err.BAD_PREV_EVENTS,
            )
        }
    }

    return _impl_makeEvent_impl_(context, pl, hashes)
}

export const makeEvents = async (
    context: SignerContext,
    payloads: PlainMessage<StreamEvent>['payload'][],
    prevEventHashes?: Uint8Array[] | Uint8Array | Map<string, Uint8Array>,
): Promise<Envelope[]> => {
    const events: Envelope[] = []
    let hashes = normailizeHashes(prevEventHashes)
    for (const payload of payloads) {
        const event = await makeEvent(context, payload, hashes)
        events.push(event)
        hashes = [event.hash]
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

export const unpackEnvelope = (envelope: Envelope, _prevEventHash?: Uint8Array): ParsedEvent => {
    check(hasElements(envelope.event), 'Event base is not set', Err.BAD_EVENT)
    check(hasElements(envelope.hash), 'Event hash is not set', Err.BAD_EVENT)
    check(hasElements(envelope.signature), 'Event signature is not set', Err.BAD_EVENT)

    const hash = townsHash(envelope.event)
    check(bin_equal(hash, envelope.hash), 'Event id is not valid', Err.BAD_EVENT_ID)

    const recoveredPubKey = townsRecoverPubKey(hash, envelope.signature)

    const e = StreamEvent.fromBinary(envelope.event)
    if (!hasElements(e.delegateSig)) {
        const address = publicKeyToAddress(recoveredPubKey)
        check(
            bin_equal(address, e.creatorAddress),
            'Event signature is not valid',
            Err.BAD_EVENT_SIGNATURE,
        )
    } else {
        checkDelegateSig(recoveredPubKey, e.creatorAddress, e.delegateSig)
    }

    if (e.payload?.value?.content.case !== 'inception') {
        check(e.prevEvents.length > 0, "prevEvents can't be empty", Err.BAD_PREV_EVENTS)
        // TODO replace with a proper check
        // check(
        //     bin_equal(e.prevEvents[0], prevEventHash),
        //     'prevEvents[0] is not valid',
        //     Err.BAD_PREV_EVENTS,
        // )
    }

    const event = stringify(e)
    return {
        event,
        envelope,
        hashStr: bin_toBase64(envelope.hash),
        creatorUserId: userIdFromAddress(e.creatorAddress),
    }
}

export const unpackEnvelopes = (event: Envelope[]): ParsedEvent[] => {
    const ret: ParsedEvent[] = []
    //let prevEventHash: Uint8Array | undefined = undefined
    for (const e of event) {
        // TODO: this handling of prevEventHash is not correct,
        // hashes should be checked against all preceding events in the stream.
        ret.push(unpackEnvelope(e /*, prevEventHash*/))
        //prevEventHash = e.hash!
    }
    return ret
}

export const makeEventRef = (streamId: string, event: Envelope): EventRef => {
    return new EventRef({
        streamId,
        hash: event.hash,
        signature: event.signature,
    })
}
