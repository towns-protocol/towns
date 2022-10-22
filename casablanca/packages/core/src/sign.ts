import {
    ecrecover,
    ecsign,
    fromRpcSig,
    hashPersonalMessage,
    publicToAddress,
    stripHexPrefix,
    toChecksumAddress,
    toRpcSig,
} from '@ethereumjs/util'
import { Wallet } from 'ethers'
import { nanoid } from 'nanoid'
import { check } from './check'
import { Err } from './err'
import { BaseEvent, EventRef, FullEvent, Payload } from './types'

export interface SignerContext {
    wallet: Wallet
    creatorAddress: string
    delegateSig?: string
}

const publicKeyToBuffer = (publicKey: string): Buffer => {
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
    zionWallet: Wallet,
): Promise<string> => {
    return await primaryWallet.signMessage(publicKeyToBuffer(zionWallet.publicKey))
}

// TODO: Here event should be hashed according to "EIP-712: Typed structured data hashing and signing"
// For now, not to fiddle with the type descriptor, we just use hashPersonalMessage.
export const hashEvent = (event: BaseEvent): [string, Buffer] => {
    const hashBuffer = hashPersonalMessage(Buffer.from(JSON.stringify(event)))
    const hash = '0x' + hashBuffer.toString('hex')
    return [hash, hashBuffer]
}

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
    payload: Payload,
    prevEvents: string[],
): FullEvent => {
    if (payload.kind !== 'inception') {
        check(prevEvents.length > 0, 'prevEvents should be present', Err.BAD_PREV_EVENTS)
    }
    const re = /^0x[0-9a-f]{64}$/
    for (const prevEvent of prevEvents) {
        check(
            re.test(prevEvent),
            'Bad hash format, should be ^0x[0-9a-f]{64}$',
            Err.BAD_HASH_FORMAT,
        )
    }

    const event: BaseEvent = {
        creatorAddress: context.creatorAddress,
        salt: nanoid(),
        prevEvents: prevEvents,
        payload: payload,
    }
    if (context.delegateSig !== undefined) {
        event.delegageSig = context.delegateSig
    }

    const [hash, hashBuffer] = hashEvent(event)
    const { v, r, s } = ecsign(
        hashBuffer,
        Buffer.from(stripHexPrefix(context.wallet.privateKey), 'hex'),
    )
    const signature = toRpcSig(v, r, s)

    return { hash, signature, base: event }
}

export const makeEvents = (
    context: SignerContext,
    payloads: Payload[],
    prevEvents: string[],
): FullEvent[] => {
    const events: FullEvent[] = []
    for (const payload of payloads) {
        const event = makeEvent(context, payload, prevEvents)
        events.push(event)
        prevEvents = [event.hash]
    }
    return events
}

export const checkDelegateSig = (
    chainedPubKey: Buffer | string,
    creatorAddress: string,
    delegateSig: string,
): void => {
    if (typeof chainedPubKey === 'string') {
        chainedPubKey = publicKeyToBuffer(chainedPubKey)
    }
    const hashBuffer = hashPersonalMessage(Buffer.from(chainedPubKey))
    const { v, r, s } = fromRpcSig(delegateSig)
    const delegatePubKey = ecrecover(hashBuffer, v, r, s)
    const delegateAddress = toChecksumAddress(
        '0x' + publicToAddress(delegatePubKey).toString('hex'),
    )
    check(
        delegateAddress === creatorAddress,
        'delegateSig does not match creatorAddress',
        Err.BAD_DELEGATE_SIG,
    )
}

export const checkEvent = (event: FullEvent, prevEventHash: string | null): void => {
    if (prevEventHash !== null) {
        check(
            event.base.prevEvents.length === 1,
            'prevEvents.length should be 1',
            Err.BAD_PREV_EVENTS,
        )
        check(
            event.base.prevEvents[0] === prevEventHash,
            'prevEvents[0] is not valid',
            Err.BAD_PREV_EVENTS,
        )
    }

    const [hash, hashBuffer] = hashEvent(event.base)
    check(hash === event.hash, 'Event id is not valid', Err.BAD_EVENT_ID)

    const { v, r, s } = fromRpcSig(event.signature)
    const pubKey = ecrecover(hashBuffer, v, r, s)

    if (event.base.delegageSig === undefined) {
        const address = toChecksumAddress('0x' + publicToAddress(pubKey).toString('hex'))
        check(
            address === event.base.creatorAddress,
            'Event signature is not valid',
            Err.BAD_EVENT_SIGNATURE,
        )
    } else {
        checkDelegateSig(pubKey, event.base.creatorAddress, event.base.delegageSig)
    }
}

export const checkEvents = (event: FullEvent[]): void => {
    let prevEventHash: string | null = null
    for (const e of event) {
        checkEvent(e, prevEventHash)
        prevEventHash = e.hash
    }
}

export const makeEventRef = (streamId: string, event: FullEvent): EventRef => {
    return {
        streamId,
        hash: event.hash,
        signature: event.signature,
        creatorAddress: event.base.creatorAddress,
    }
}
