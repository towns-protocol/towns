import { normailizeHashes, SignerContext, _impl_makeEvent_impl_ } from './sign'

import { dlog } from './dlog'
import { Envelope, StreamEvent } from '@river/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { Client } from './client'
import { userIdFromAddress } from './id'
import { ParsedEvent, takeKeccakFingerprintInHex } from './types'
import { bin_fromHexString, bin_toHexString } from './binary'
import { getPublicKey, utils } from 'ethereum-cryptography/secp256k1'
import { makeTownsDelegateSig, makeOldTownsDelegateSig, publicKeyToAddress } from './crypto/crypto'
import { ethers } from 'ethers'
import { RiverDbManager } from './riverDbManager'
import { StreamRpcClientType, makeStreamRpcClient } from './makeStreamRpcClient'
import assert from 'assert'
import { setTimeout } from 'timers/promises'
import _ from 'lodash'
import { EntitlementsDelegate } from './riverDecryptionExtensions'
import { MockEntitlementsDelegate } from './utils'

const log = dlog('csb:test:util')

export const TEST_URL = global.origin // global.origin is populated by 'url' in jest.config.ts
export const TEST_URL_WITH_ENTITILEMENTS = 'http://localhost:5157'

export const makeTestRpcClient = () => makeStreamRpcClient(TEST_URL)

export const makeEvent_test = async (
    context: SignerContext,
    payload: PlainMessage<StreamEvent>['payload'],
    prevEventHashes?: Uint8Array[] | Uint8Array | Map<string, Uint8Array>,
): Promise<Envelope> => {
    const hashes = normailizeHashes(prevEventHashes)
    return _impl_makeEvent_impl_(context, payload, hashes)
}

/**
 *
 * @returns a random user context
 * Done using a worker thread to avoid blocking the main thread
 */
export const makeRandomUserContext = async (): Promise<SignerContext> => {
    const userPrivateKey = utils.randomPrivateKey()
    const devicePrivateKey = utils.randomPrivateKey()
    const devicePrivateKeyStr = bin_toHexString(devicePrivateKey)

    const creatorAddress = publicKeyToAddress(getPublicKey(userPrivateKey, false))
    const ret: SignerContext = {
        signerPrivateKey: () => devicePrivateKeyStr,
        creatorAddress,
        delegateSig: await makeTownsDelegateSig(
            () => userPrivateKey,
            getPublicKey(devicePrivateKeyStr, false),
        ),
        deviceId: takeKeccakFingerprintInHex(creatorAddress, 16),
    }
    log('makeRandomUserContext', creatorAddress)
    return ret
}

export const makeUserContextFromWallet = async (wallet: ethers.Wallet): Promise<SignerContext> => {
    const userPrimaryWallet = wallet
    const devicePrivateKey = utils.randomPrivateKey()
    const devicePrivateKeyStr = bin_toHexString(devicePrivateKey)

    const creatorAddress = publicKeyToAddress(bin_fromHexString(userPrimaryWallet.publicKey))
    log('makeRandomUserContext', userIdFromAddress(creatorAddress))
    return {
        signerPrivateKey: () => devicePrivateKeyStr,
        creatorAddress,
        delegateSig: await makeOldTownsDelegateSig(
            userPrimaryWallet,
            getPublicKey(devicePrivateKeyStr, false),
        ),
        deviceId: `${Date.now()}_${Math.floor(Math.random() * 4095).toString(16)}`,
    }
}

export const makeTestClient = async (
    url?: string,
    context?: SignerContext,
    entitlementsDelegate?: EntitlementsDelegate,
): Promise<Client> => {
    if (url === undefined) {
        url = TEST_URL
    }
    if (context === undefined) {
        context = await makeRandomUserContext()
    }
    // create a new client with store(s)
    const cryptoStore = RiverDbManager.getCryptoDb(userIdFromAddress(context.creatorAddress))
    return new Client(
        context,
        makeStreamRpcClient(url),
        cryptoStore,
        entitlementsDelegate ?? new MockEntitlementsDelegate(),
        undefined,
    )
}

class DonePromise {
    promise: Promise<string>
    // @ts-ignore: Promise body is executed immediately, so vars are assigned before constructor returns
    resolve: (value: string) => void
    // @ts-ignore: Promise body is executed immediately, so vars are assigned before constructor returns
    reject: (reason: any) => void

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        })
    }

    done(): void {
        this.resolve('done')
    }

    async wait(): Promise<string> {
        return this.promise
    }

    async expectToSucceed(): Promise<void> {
        await expect(this.promise).resolves.toBe('done')
    }

    async expectToFail(): Promise<void> {
        await expect(this.promise).rejects.toThrow()
    }

    run(fn: () => void): void {
        try {
            fn()
        } catch (err) {
            this.reject(err)
        }
    }

    async runAsync(fn: () => Promise<any>): Promise<void> {
        try {
            await fn()
        } catch (err) {
            this.reject(err)
        }
    }

    runAndDone(fn: () => void): void {
        try {
            fn()
            this.done()
        } catch (err) {
            this.reject(err)
        }
    }

    async runAndDoneAsync(fn: () => Promise<any>): Promise<void> {
        try {
            await fn()
            this.done()
        } catch (err) {
            this.reject(err)
        }
    }
}

export const makeDonePromise = (): DonePromise => {
    return new DonePromise()
}

export const sendFlush = async (client: StreamRpcClientType): Promise<void> => {
    const r = await client.info({ debug: 'flush_cache' })
    assert(r.graffiti === 'cache flushed')
}

export async function* timeoutIterable<T>(
    iterable: AsyncIterable<T>,
    timeoutMs: number,
): AsyncGenerator<T, void, unknown> {
    const iterator = iterable[Symbol.asyncIterator]()
    const controller = new AbortController()

    while (true) {
        const result = await Promise.race([
            iterator.next(),
            setTimeout(timeoutMs, 'timeout', { signal: controller.signal }),
        ])

        if (typeof result === 'string') {
            return
        }

        if (result.done) {
            controller.abort()
            return
        }

        yield result.value
    }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const controller = new AbortController()

    const timeoutPromise = setTimeout(timeoutMs, 'timeout', { signal: controller.signal })

    const result = await Promise.race([promise, timeoutPromise])
    if (typeof result === 'string') {
        throw new Error('promise timeout')
    }
    controller.abort()
    return result
}
// For example, use like this:
//
//    joinPayload = lastEventFiltered(
//        unpackEnvelopes(userResponse.stream!.events),
//        getUserPayload_Membership,
//    )
//
// to get user memebrship payload from a last event containing it, or undefined if not found.
export const lastEventFiltered = <T extends (a: ParsedEvent) => any>(
    events: ParsedEvent[],
    f: T,
): ReturnType<T> | undefined => {
    let ret: ReturnType<T> | undefined = undefined
    _.forEachRight(events, (v): boolean => {
        const r = f(v)
        if (r !== undefined) {
            ret = r
            return false
        }
        return true
    })
    return ret
}

export function waitFor<T>(
    callback: (() => T) | (() => Promise<T>),
    options: { timeoutMS: number } = { timeoutMS: 5000 },
): Promise<T | undefined> {
    const errorContext: Error = new Error(
        'waitFor timed out after ' + options.timeoutMS.toString() + 'ms',
    )
    return new Promise((resolve, reject) => {
        const timeoutMS = options.timeoutMS ?? 1000
        const pollIntervalMS = Math.min(timeoutMS / 2, 100)
        let lastError: any = undefined
        let promiseStatus: 'none' | 'pending' | 'resolved' | 'rejected' = 'none'
        const intervalId = setInterval(checkCallback, pollIntervalMS)
        const timeoutId = setInterval(onTimeout, timeoutMS)
        function onDone(result?: T) {
            clearInterval(intervalId)
            clearInterval(timeoutId)
            if (result) {
                resolve(result)
            } else {
                reject(lastError)
            }
        }
        function onTimeout() {
            lastError = lastError ?? errorContext
            onDone()
        }
        function checkCallback() {
            if (promiseStatus === 'pending') return
            try {
                const result = callback()
                if (result && result instanceof Promise) {
                    promiseStatus = 'pending'
                    result.then(
                        (res) => {
                            promiseStatus = 'resolved'
                            onDone(res)
                        },
                        (err) => {
                            promiseStatus = 'rejected'
                            lastError = err
                        },
                    )
                } else {
                    promiseStatus = 'resolved'
                    resolve(result)
                }
            } catch (err) {
                lastError = err
            }
        }
    })
}
