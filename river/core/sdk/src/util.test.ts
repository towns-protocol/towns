import { _impl_makeEvent_impl_, publicKeyToAddress, unpackStreamEnvelopes } from './sign'

import {
    EncryptedData,
    Envelope,
    StreamEvent,
    ChannelMessage,
    SnapshotCaseType,
    SyncStreamsResponse,
    SyncOp,
} from '@river-build/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { Client } from './client'
import { genId, makeSpaceStreamId, userIdFromAddress } from './id'
import { ParsedEvent, DecryptedTimelineEvent } from './types'
import { getPublicKey, utils } from 'ethereum-cryptography/secp256k1'
import { EntitlementsDelegate } from '@river-build/encryption'
import { bin_fromHexString, check, dlog } from '@river-build/dlog'
import { ethers } from 'ethers'
import { RiverDbManager } from './riverDbManager'
import { StreamRpcClientType, makeStreamRpcClient } from './makeStreamRpcClient'
import assert from 'assert'
import _ from 'lodash'
import { MockEntitlementsDelegate } from './utils'
import { SignerContext, makeSignerContext } from './signerContext'
import {
    Address,
    BaseChainConfig,
    ContractVersion,
    LocalhostWeb3Provider,
    PricingModuleStruct,
    RiverChainConfig,
    Web3Deployment,
    createRiverRegistry,
    getWeb3Deployment,
} from '@river-build/web3'

const log = dlog('csb:test:util')

const RIVER_ENV = process.env.RIVER_ENV || 'local_single'

function getBaseRpcUrlForChain(chainId: number): string {
    if (process.env.BASE_CHAIN_RPC_URL) {
        return process.env.BASE_CHAIN_RPC_URL
    }
    switch (chainId) {
        case 31337:
            return 'http://localhost:8545'
        default:
            throw new Error(`No preset RPC url for base chainId ${chainId}`)
    }
}

function getRiverRpcUrlForChain(chainId: number): string {
    if (process.env.RIVER_CHAIN_RPC_URL) {
        return process.env.RIVER_CHAIN_RPC_URL
    }
    switch (chainId) {
        case 31338:
            return 'http://localhost:8546'
        case 6524490:
            return 'https://devnet.rpc.river.build'
        default:
            throw new Error(`No preset RPC url for river chainId ${chainId}`)
    }
}

const getTestWeb3Deployment = (): Web3Deployment => {
    // allow for passing a custom environment
    if (RIVER_ENV === 'custom') {
        return {
            base: {
                chainId: parseInt(process.env.BASE_CHAIN_ID!),
                contractVersion: (process.env.CONTRACT_VERSION ?? 'dev') as ContractVersion,
                addresses: {
                    spaceFactory: process.env.SPACE_FACTORY_ADDRESS! as Address,
                    spaceOwner: process.env.SPACE_OWNER_ADDRESS! as Address,
                    mockNFT: process.env.MOCK_NFT_ADDRESS as Address | undefined,
                    member: process.env.MEMBER_ADDRESS as Address | undefined,
                    walletLink: process.env.WALLET_LINK_ADDRESS! as Address,
                },
            },
            river: {
                chainId: parseInt(process.env.RIVER_CHAIN_ID!),
                contractVersion: (process.env.CONTRACT_VERSION ?? 'dev') as ContractVersion,
                addresses: {
                    riverRegistry: process.env.RIVER_REGISTRY_ADDRESS! as Address,
                },
            },
        }
    }
    // otherwise just return the deployment for the current environment
    return getWeb3Deployment(RIVER_ENV)
}

export const makeRiverChainConfig = (): {
    rpcUrl: string
    chainConfig: RiverChainConfig
} => {
    const env = getTestWeb3Deployment()
    return {
        rpcUrl: getRiverRpcUrlForChain(env.river.chainId),
        chainConfig: env.river,
    }
}

export const makeBaseChainConfig = (): { rpcUrl: string; chainConfig: BaseChainConfig } => {
    const env = getTestWeb3Deployment()
    return {
        rpcUrl: getBaseRpcUrlForChain(env.base.chainId),
        chainConfig: env.base,
    }
}

export type TestConfig = ReturnType<typeof makeTestConfig>

export const makeTestConfig = () => {
    return {
        base: makeBaseChainConfig(),
        river: makeRiverChainConfig(),
    }
}

const initTestUrls = async (): Promise<{
    testUrls: string[]
    refreshNodeUrl?: () => Promise<string>
}> => {
    const config = makeRiverChainConfig()
    const provider = new LocalhostWeb3Provider(config.rpcUrl)
    const riverRegistry = createRiverRegistry(provider, config.chainConfig)
    const urls = await riverRegistry.getOperationalNodeUrls()
    const refreshNodeUrl = () => riverRegistry.getOperationalNodeUrls()
    log('initTestUrls, RIVER_TEST_CONNECT=', config, 'testUrls=', urls)
    return { testUrls: urls.split(','), refreshNodeUrl }
}

let curTestUrl = -1
const getNextTestUrl = async (): Promise<{
    urls: string
    refreshNodeUrl?: () => Promise<string>
}> => {
    const { testUrls, refreshNodeUrl } = await initTestUrls()
    if (testUrls.length === 1) {
        log('getNextTestUrl, url=', testUrls[0])
        return { urls: testUrls[0], refreshNodeUrl }
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
        return { urls: testUrls[curTestUrl], refreshNodeUrl }
    } else {
        throw new Error('no test urls')
    }
}

export const makeTestRpcClient = async () => {
    const { urls: url, refreshNodeUrl } = await getNextTestUrl()
    return makeStreamRpcClient(url, undefined, refreshNodeUrl)
}

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
 * makeUniqueSpaceStreamId - space stream ids are derived from the contract
 * in tests without entitlements there are no contracts, so we use a random id
 */
export const makeUniqueSpaceStreamId = (): string => {
    return makeSpaceStreamId(genId(40))
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
    const rpcClient = await makeTestRpcClient()
    return new Client(context, rpcClient, cryptoStore, entitlementsDelegate, persistenceDbName)
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

export const TIERED_PRICING_ORACLE = 'TieredLogPricingOracle'
export const FIXED_PRICING = 'FixedPricing'

export const getDynamicPricingModule = (pricingModules: PricingModuleStruct[]) => {
    return pricingModules.find((module) => module.name === TIERED_PRICING_ORACLE)
}

export const getFixedPricingModule = (pricingModules: PricingModuleStruct[]) => {
    return pricingModules.find((module) => module.name === FIXED_PRICING)
}
