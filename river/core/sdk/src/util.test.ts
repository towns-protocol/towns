import { _impl_makeEvent_impl_, publicKeyToAddress, unpackStreamEnvelopes } from './sign'

import {
    EncryptedData,
    Envelope,
    StreamEvent,
    ChannelMessage,
    SnapshotCaseType,
    SyncStreamsResponse,
    SyncOp,
} from '@river/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { Client } from './client'
import { userIdFromAddress } from './id'
import { ParsedEvent, DecryptedTimelineEvent } from './types'
import { getPublicKey, utils } from 'ethereum-cryptography/secp256k1'
import { bin_fromHexString, check, dlog } from '@river/dlog'
import { ethers } from 'ethers'
import { RiverDbManager } from './riverDbManager'
import { StreamRpcClientType, makeStreamRpcClient } from './makeStreamRpcClient'
import assert from 'assert'
import _ from 'lodash'
import { MockEntitlementsDelegate } from './utils'
import { EntitlementsDelegate } from './decryptionExtensions'
import { SignerContext, makeSignerContext } from './signerContext'

const log = dlog('csb:test:util')

const TEST_URL_SINGLE = 'https://localhost:5158'
const TEST_URL_SINGLE_ENT = 'https://localhost:5157'
const TEST_URL_MULTI =
    'https://localhost:5170,https://localhost:5171,https://localhost:5172,https://localhost:5173,https://localhost:5174,' +
    'https://localhost:5175,https://localhost:5176,https://localhost:5177,https://localhost:5178,https://localhost:5179'

const initTestUrls = () => {
    if (process.env.RIVER_TEST_URLS !== undefined && process.env.RIVER_TEST_URLS !== '') {
        const urls = process.env.RIVER_TEST_URLS.split(',')
        log(
            'initTestUrls, Using explicit urls from RIVER_TEST_URLS, not RIVER_TEST_CONNECT, urls=',
            urls,
        )
        return urls
    }
    const config = process.env.RIVER_TEST_CONNECT
    let urls: string[]
    if (config === 'single') {
        urls = [TEST_URL_SINGLE]
    } else if (config === 'single_ent') {
        urls = [TEST_URL_SINGLE_ENT]
    } else if (config === 'multi') {
        urls = TEST_URL_MULTI.split(',')
    } else {
        throw new Error(`invalid RIVER_TEST_CONNECT: ${config}`)
    }
    log('initTestUrls, RIVER_TEST_CONNECT=', config, 'urls=', urls)
    return urls
}

const testUrls = initTestUrls()
let curTestUrl = -1

export const getNextTestUrl = () => {
    if (testUrls.length === 1) {
        log('getNextTestUrl, url=', testUrls[0])
        return testUrls[0]
    } else if (testUrls.length > 1) {
        if (curTestUrl < 0) {
            const seed: string | undefined = expect.getState()?.currentTestName
            if (seed === undefined) {
                curTestUrl = Math.floor(Math.random() * testUrls.length)
                log('getNextTestUrl, setting to random, index=', curTestUrl)
            } else {
                curTestUrl =
                    seed
                        .split('')
                        .map((v) => v.charCodeAt(0))
                        .reduce((a, v) => ((a + ((a << 7) + (a << 3))) ^ v) & 0xffff) %
                    testUrls.length
                log('getNextTestUrl, setting based on test name=', seed, ' index=', curTestUrl)
            }
        }
        curTestUrl = (curTestUrl + 1) % testUrls.length
        log('getNextTestUrl, url=', testUrls[curTestUrl], 'index=', curTestUrl)
        return testUrls[curTestUrl]
    } else {
        throw new Error('no test urls')
    }
}

export const makeTestRpcClient = () => makeStreamRpcClient(getNextTestUrl())

export const makeEvent_test = async (
    context: SignerContext,
    payload: PlainMessage<StreamEvent>['payload'],
    prevMiniblockHash?: Uint8Array,
): Promise<Envelope> => {
    return _impl_makeEvent_impl_(context, payload, prevMiniblockHash)
}

export const TEST_ENCRYPTED_MESSAGE_PROPS: PlainMessage<EncryptedData> = {
    sessionId: '',
    ciphertext: '',
    algorithm: '',
    senderKey: '',
}

/**
 *
 * @returns a random user context
 * Done using a worker thread to avoid blocking the main thread
 */
export const makeRandomUserContext = async (): Promise<SignerContext> => {
    const wallet = ethers.Wallet.createRandom()
    log('makeRandomUserContext', wallet.address)
    return makeUserContextFromWallet(wallet)
}

export const makeRandomUserAddress = (): Uint8Array => {
    return publicKeyToAddress(getPublicKey(utils.randomPrivateKey(), false))
}

export const makeUserContextFromWallet = async (wallet: ethers.Wallet): Promise<SignerContext> => {
    const userPrimaryWallet = wallet
    const delegateWallet = ethers.Wallet.createRandom()
    const creatorAddress = publicKeyToAddress(bin_fromHexString(userPrimaryWallet.publicKey))
    log('makeRandomUserContext', userIdFromAddress(creatorAddress))

    return makeSignerContext(userPrimaryWallet, delegateWallet, { days: 1 })
}

export interface TestClientOpts {
    context?: SignerContext
    entitlementsDelegate?: EntitlementsDelegate
    deviceId?: string
}

export const makeTestClient = async (opts?: TestClientOpts): Promise<Client> => {
    const context = opts?.context ?? (await makeRandomUserContext())
    const entitlementsDelegate = opts?.entitlementsDelegate ?? new MockEntitlementsDelegate()
    const deviceId = opts?.deviceId ? `-${opts.deviceId}` : ''
    const userId = userIdFromAddress(context.creatorAddress)
    const dbName = `database-${userId}${deviceId}`
    const persistenceDbName = `persistence-${userId}${deviceId}`

    // create a new client with store(s)
    const cryptoStore = RiverDbManager.getCryptoDb(userId, dbName)
    return new Client(
        context,
        makeTestRpcClient(),
        cryptoStore,
        entitlementsDelegate,
        persistenceDbName,
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

    runAndDone(fn: () => void): void {
        try {
            fn()
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
    const r = await client.info({ debug: ['flush_cache'] })
    assert(r.graffiti === 'cache flushed')
}

export async function* iterableWrapper<T>(
    iterable: AsyncIterable<T>,
): AsyncGenerator<T, void, unknown> {
    const iterator = iterable[Symbol.asyncIterator]()

    while (true) {
        const result = await iterator.next()

        if (typeof result === 'string') {
            return
        }

        yield result.value
    }
}

// For example, use like this:
//
//    joinPayload = lastEventFiltered(
//        unpackStreamEnvelopes(userResponse.stream!),
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
    const timeoutContext: Error = new Error(
        'waitFor timed out after ' + options.timeoutMS.toString() + 'ms',
    )
    return new Promise((resolve, reject) => {
        const timeoutMS = options.timeoutMS
        const pollIntervalMS = Math.min(timeoutMS / 2, 100)
        let lastError: any = undefined
        let promiseStatus: 'none' | 'pending' | 'resolved' | 'rejected' = 'none'
        const intervalId = setInterval(checkCallback, pollIntervalMS)
        const timeoutId = setInterval(onTimeout, timeoutMS)
        function onDone(result?: T) {
            clearInterval(intervalId)
            clearInterval(timeoutId)
            if (result || promiseStatus === 'resolved') {
                resolve(result)
            } else {
                reject(lastError)
            }
        }
        function onTimeout() {
            lastError = lastError ?? timeoutContext
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
                            // splat the error to get a stack trace, i don't know why this works
                            lastError = {
                                ...err,
                            }
                        },
                    )
                } else {
                    promiseStatus = 'resolved'
                    resolve(result)
                }
            } catch (err: any) {
                lastError = err
            }
        }
    })
}

export async function waitForSyncStreams(
    syncStreams: AsyncIterable<SyncStreamsResponse>,
    matcher: (res: SyncStreamsResponse) => Promise<boolean>,
): Promise<SyncStreamsResponse> {
    for await (const res of iterableWrapper(syncStreams)) {
        if (await matcher(res)) {
            return res
        }
    }
    throw new Error('waitFor: timeout')
}

export async function waitForSyncStreamsMessage(
    syncStreams: AsyncIterable<SyncStreamsResponse>,
    message: string,
): Promise<SyncStreamsResponse> {
    return waitForSyncStreams(syncStreams, async (res) => {
        if (res.syncOp === SyncOp.SYNC_UPDATE) {
            const stream = res.stream
            if (stream) {
                const env = await unpackStreamEnvelopes(stream)
                for (const e of env) {
                    if (e.event.payload.case === 'channelPayload') {
                        const p = e.event.payload.value.content
                        if (p.case === 'message' && p.value.ciphertext === message) {
                            return true
                        }
                    }
                }
            }
        }
        return false
    })
}

export function getChannelMessagePayload(event?: ChannelMessage) {
    if (event?.payload?.case === 'post') {
        if (event.payload.value.content.case === 'text') {
            return event.payload.value.content.value?.body
        }
    }
    return undefined
}

export function createEventDecryptedPromise(client: Client, expectedMessageText: string) {
    const recipientReceivesMessageWithoutError = makeDonePromise()
    client.on(
        'eventDecrypted',
        (streamId: string, contentKind: SnapshotCaseType, event: DecryptedTimelineEvent): void => {
            recipientReceivesMessageWithoutError.runAndDone(() => {
                const content = event.decryptedContent
                expect(content).toBeDefined()
                check(content.kind === 'channelMessage')
                expect(getChannelMessagePayload(content?.content)).toEqual(expectedMessageText)
            })
        },
    )
    return recipientReceivesMessageWithoutError.promise
}

export function isValidEthAddress(address: string): boolean {
    const ethAddressRegex = /^(0x)?[0-9a-fA-F]{40}$/
    return ethAddressRegex.test(address)
}
