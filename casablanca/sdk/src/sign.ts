import { PartialMessage } from '@bufbuild/protobuf'
import {
    ecrecover,
    ecsign,
    fromRpcSig,
    hashPersonalMessage,
    publicToAddress,
    stripHexPrefix,
    toRpcSig,
} from '@ethereumjs/util'
import { Envelope, EventRef, Payload, StreamEvent, Err } from '@towns/proto'
import { Buffer } from 'buffer'
import { Wallet } from 'ethers'
import { check, hasElements, isDefined } from './check'
import { genIdBlob, userIdFromAddress } from './id'
import { bin_equal, bin_fromHexString, bin_toHexString, ParsedEvent, stringify } from './types'

// TODO: a lot of unnecessary buffer copying and conversion below, optimize.

export interface SignerContext {
    wallet: Wallet
    creatorAddress: Uint8Array
    delegateSig?: Uint8Array
}

export const publicKeyToBuffer = (publicKey: string): Buffer => {
    // Uncompressed public key in string form should start with '0x04'.
    check(
        typeof publicKey === 'string' && publicKey.startsWith('0x04'),
        'Bad public key',
        Err.BAD_PUBLIC_KEY,
    )
    return Buffer.from(publicKey.slice(4), 'hex')
}

export const makeDelegateSig = async (
    primaryWallet: Wallet,
    signatureWallet: Wallet,
): Promise<Uint8Array> => {
    return bin_fromHexString(
        await primaryWallet.signMessage(publicKeyToBuffer(signatureWallet.publicKey)),
    )
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

// TODO: Here event should be hashed according to "EIP-712: Typed structured data hashing and signing"
// For now, not to fiddle with the type descriptor, we just use hashPersonalMessage.
// export const hashEvent = (event: IBaseEvent): [string, Buffer] => {
//     const hashBuffer = hashPersonalMessage(Buffer.from(JSON.stringify(event)))
//     const hash = '0x' + hashBuffer.toString('hex')
//     return [hash, hashBuffer]
// }

// To make event, we need hash, creator address and signature
// Sign APIs usually only return a signature, so this implementation
// hashes and then signs directly by using private key from the Wallet.
//
// TODO: switch to signTypedData before realease, which is more stable than this implementation
// due to potensial instability in JSON encoding.
// signTypedData requires type descriptor, and a bit too much to maintain
// it at this stage of development.
export const makeEvent = (
    context: SignerContext,
    payload: Payload | PartialMessage<Payload>,
    prevEventHashes?: Uint8Array[] | Uint8Array | Map<string, Uint8Array>,
): Envelope => {
    const hashes = normailizeHashes(prevEventHashes)
    const pl: Payload = payload instanceof Payload ? payload : new Payload(payload)
    check(isDefined(pl.payload.case), "Payload can't be empty", Err.BAD_PAYLOAD)

    if (pl.payload.case !== 'inception') {
        check(hashes.length > 0, 'prevEventHashes should be present', Err.BAD_PREV_EVENTS)

        for (const prevEvent of hashes) {
            check(
                prevEvent.length === 32,
                'prevEventHashes should be 32 bytes',
                Err.BAD_PREV_EVENTS,
            )
        }
    }

    const streamEvent = new StreamEvent({
        creatorAddress: context.creatorAddress,
        salt: genIdBlob(),
        prevEvents: hashes,
        payload: payload,
    })
    if (context.delegateSig !== undefined) {
        streamEvent.delegageSig = context.delegateSig
    }

    const event = streamEvent.toBinary()
    const hash = hashPersonalMessage(Buffer.from(event))
    const { v, r, s } = ecsign(hash, Buffer.from(stripHexPrefix(context.wallet.privateKey), 'hex'))

    const signature = bin_fromHexString(toRpcSig(v, r, s))

    return new Envelope({ hash: Uint8Array.from(hash), signature, event })
}

export const makeEvents = (
    context: SignerContext,
    payloads: (Payload | PartialMessage<Payload>)[],
    prevEventHashes?: Uint8Array[] | Uint8Array | Map<string, Uint8Array>,
): Envelope[] => {
    const events: Envelope[] = []
    let hashes = normailizeHashes(prevEventHashes)
    for (const payload of payloads) {
        const event = makeEvent(context, payload, hashes)
        events.push(event)
        hashes = [event.hash]
    }
    return events
}

export const checkDelegateSig = (
    chainedPubKey: Buffer | string,
    creatorAddress: Uint8Array | string,
    delegateSig: Uint8Array,
): void => {
    if (typeof chainedPubKey === 'string') {
        chainedPubKey = publicKeyToBuffer(chainedPubKey)
    }
    if (typeof creatorAddress === 'string') {
        creatorAddress = bin_fromHexString(creatorAddress)
    }
    const hashBuffer = hashPersonalMessage(Buffer.from(chainedPubKey))

    const { v, r, s } = fromRpcSig(bin_toHexString(delegateSig))
    const delegatePubKey = ecrecover(hashBuffer, v, r, s)
    const delegateAddress = Uint8Array.from(publicToAddress(delegatePubKey))
    check(
        bin_equal(delegateAddress, creatorAddress),
        'delegateSig does not match creatorAddress',
        Err.BAD_DELEGATE_SIG,
    )
}

export const unpackEnvelope = (envelope: Envelope, _prevEventHash?: Uint8Array): ParsedEvent => {
    check(hasElements(envelope.event), 'Event base is not set', Err.BAD_EVENT)
    check(hasElements(envelope.hash), 'Event hash is not set', Err.BAD_EVENT)
    check(hasElements(envelope.signature), 'Event signature is not set', Err.BAD_EVENT)

    const hash = hashPersonalMessage(Buffer.from(envelope.event))
    check(bin_equal(hash, envelope.hash), 'Event id is not valid', Err.BAD_EVENT_ID)

    const { v, r, s } = fromRpcSig(bin_toHexString(envelope.signature))
    const pubKey = ecrecover(hash, v, r, s)

    const e = StreamEvent.fromBinary(envelope.event)
    if (!hasElements(e.delegageSig)) {
        const address = Uint8Array.from(publicToAddress(pubKey))
        check(
            bin_equal(address, e.creatorAddress),
            'Event signature is not valid',
            Err.BAD_EVENT_SIGNATURE,
        )
    } else {
        checkDelegateSig(pubKey, e.creatorAddress, e.delegageSig)
    }

    if (e.payload?.payload.case !== 'inception') {
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
        hashStr: bin_toHexString(envelope.hash),
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
