import { _impl_makeEvent_impl_, publicKeyToAddress, unpackStreamEnvelopes } from './sign'

import {
    EncryptedData,
    Envelope,
    StreamEvent,
    ChannelMessage,
    MembershipOp,
    SnapshotCaseType,
    SyncStreamsResponse,
    SyncOp,
} from '@river-build/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { StreamStateView } from './streamStateView'
import { Client } from './client'
import { makeBaseChainConfig, makeRiverChainConfig } from './riverConfig'
import {
    genId,
    makeSpaceStreamId,
    makeDefaultChannelStreamId,
    makeUniqueChannelStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import { ParsedEvent, DecryptedTimelineEvent } from './types'
import { getPublicKey, utils } from 'ethereum-cryptography/secp256k1'
import { EntitlementsDelegate } from '@river-build/encryption'
import { bin_fromHexString, check, dlog } from '@river-build/dlog'
import { ethers, ContractTransaction } from 'ethers'
import { RiverDbManager } from './riverDbManager'
import { StreamRpcClientType, makeStreamRpcClient } from './makeStreamRpcClient'
import assert from 'assert'
import _ from 'lodash'
import { MockEntitlementsDelegate } from './utils'
import { SignerContext, makeSignerContext } from './signerContext'
import {
    LocalhostWeb3Provider,
    PricingModuleStruct,
    createExternalNFTStruct,
    createRiverRegistry,
    createSpaceDapp,
    IRuleEntitlement,
    Permission,
    ISpaceDapp,
    IArchitectBase,
    ETH_ADDRESS,
    MembershipStruct,
    NoopRuleData,
    CheckOperationType,
    LogicalOperationType,
    Operation,
    OperationType,
    treeToRuleData,
} from '@river-build/web3'

const log = dlog('csb:test:util')

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
    const deviceId = opts?.deviceId ? `-${opts.deviceId}` : `-${genId(5)}`
    const userId = userIdFromAddress(context.creatorAddress)
    const dbName = `database-${userId}${deviceId}`
    const persistenceDbName = `persistence-${userId}${deviceId}`

    // create a new client with store(s)
    const cryptoStore = RiverDbManager.getCryptoDb(userId, dbName)
    const rpcClient = await makeTestRpcClient()
    return new Client(context, rpcClient, cryptoStore, entitlementsDelegate, persistenceDbName)
}

export async function setupWalletsAndContexts() {
    const baseConfig = makeBaseChainConfig()

    const [alicesWallet, bobsWallet, carolsWallet] = await Promise.all([
        ethers.Wallet.createRandom(),
        ethers.Wallet.createRandom(),
        ethers.Wallet.createRandom(),
    ])

    const [alicesContext, bobsContext] = await Promise.all([
        makeUserContextFromWallet(alicesWallet),
        makeUserContextFromWallet(bobsWallet),
    ])

    const aliceProvider = new LocalhostWeb3Provider(baseConfig.rpcUrl, alicesWallet)
    const bobProvider = new LocalhostWeb3Provider(baseConfig.rpcUrl, bobsWallet)
    const carolProvider = new LocalhostWeb3Provider(baseConfig.rpcUrl, carolsWallet)

    await Promise.all([
        aliceProvider.fundWallet(),
        bobProvider.fundWallet(),
        carolProvider.fundWallet(),
    ])

    const bobSpaceDapp = createSpaceDapp(bobProvider, baseConfig.chainConfig)
    const aliceSpaceDapp = createSpaceDapp(aliceProvider, baseConfig.chainConfig)
    const carolSpaceDapp = createSpaceDapp(carolProvider, baseConfig.chainConfig)

    // create a user
    const [alice, bob] = await Promise.all([
        makeTestClient({
            context: alicesContext,
        }),
        makeTestClient({ context: bobsContext }),
    ])

    return {
        alice,
        bob,
        alicesWallet,
        bobsWallet,
        alicesContext,
        bobsContext,
        aliceProvider,
        bobProvider,
        aliceSpaceDapp,
        bobSpaceDapp,
        // Return a third wallet / provider for wallet linking
        carolsWallet,
        carolProvider,
        carolSpaceDapp,
    }
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

// createSpaceAndDefaultChannel creates a space and default channel for a given
// client, on the spaceDapp and the stream node. It creates a user stream, joins
// the user to the space, and starts syncing the client.
export async function createSpaceAndDefaultChannel(
    client: Client,
    spaceDapp: ISpaceDapp,
    wallet: ethers.Wallet,
    name: string,
    membership: IArchitectBase.MembershipStruct,
): Promise<{
    spaceId: string
    defaultChannelId: string
    userStreamView: StreamStateView
}> {
    const transaction = await spaceDapp.createSpace(
        {
            spaceName: `${name}-space`,
            spaceMetadata: `${name}-space-metadata`,
            channelName: 'general',
            membership,
        },
        wallet,
    )
    const receipt = await transaction.wait()
    expect(receipt.status).toEqual(1)
    const spaceAddress = spaceDapp.getSpaceAddress(receipt)
    expect(spaceAddress).toBeDefined()

    const spaceId = makeSpaceStreamId(spaceAddress!)
    const channelId = makeDefaultChannelStreamId(spaceAddress!)

    await client.initializeUser({ spaceId })
    client.startSync()

    const userStreamId = makeUserStreamId(client.userId)
    const userStreamView = client.stream(userStreamId)!.view
    expect(userStreamView).toBeDefined()

    const returnVal = await client.createSpace(spaceId)
    expect(returnVal.streamId).toEqual(spaceId)
    expect(userStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBeTrue()

    const channelReturnVal = await client.createChannel(
        spaceId,
        'general',
        `${name} general channel properties`,
        channelId,
    )
    expect(channelReturnVal.streamId).toEqual(channelId)
    expect(userStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBeTrue()

    return {
        spaceId,
        defaultChannelId: channelId,
        userStreamView,
    }
}

// createUserStreamAndSyncClient creates a user stream for a given client that
// uses a newly created space as the hint for the user stream, since the stream
// node will not allow the creation of a user stream without a space id.
export async function createUserStreamAndSyncClient(
    client: Client,
    spaceDapp: ISpaceDapp,
    name: string,
    membershipInfo: IArchitectBase.MembershipStruct,
    wallet: ethers.Wallet,
) {
    const transaction = await spaceDapp.createSpace(
        {
            spaceName: `${name}-space`,
            spaceMetadata: `${name}-space-metadata`,
            channelName: 'general',
            membership: membershipInfo,
        },
        wallet,
    )
    const receipt = await transaction.wait()
    expect(receipt.status).toEqual(1)
    const spaceAddress = spaceDapp.getSpaceAddress(receipt)
    expect(spaceAddress).toBeDefined()

    const spaceId = makeSpaceStreamId(spaceAddress!)
    await client.initializeUser({ spaceId })
}

export async function expectUserCanJoin(
    spaceId: string,
    channelId: string,
    name: string,
    client: Client,
    spaceDapp: ISpaceDapp,
    address: string,
    wallet: ethers.Wallet,
) {
    const joinStart = Date.now()
    const { issued } = await spaceDapp.joinSpace(spaceId, address, wallet)
    expect(issued).toBeTrue()
    log(`${name} joined space ${spaceId}`, Date.now() - joinStart)

    await client.initializeUser({ spaceId })
    client.startSync()

    await expect(client.joinStream(spaceId)).toResolve()
    await expect(client.joinStream(channelId)).toResolve()

    const userStreamView = client.stream(client.userStreamId!)!.view
    await waitFor(() => {
        expect(userStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBeTrue()
        expect(userStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBeTrue()
    })
}

export async function everyoneMembershipStruct(
    spaceDapp: ISpaceDapp,
    client: Client,
): Promise<MembershipStruct> {
    const pricingModules = await spaceDapp.listPricingModules()
    const dynamicPricingModule = getDynamicPricingModule(pricingModules)
    expect(dynamicPricingModule).toBeDefined()

    return {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 1000,
            duration: 0,
            currency: ETH_ADDRESS,
            feeRecipient: client.userId,
            freeAllocation: 0,
            pricingModule: dynamicPricingModule!.module,
        },
        permissions: [Permission.Read, Permission.Write],
        requirements: {
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
        },
    }
}

export function twoNftRuleData(
    nft1Address: string,
    nft2Address: string,
    logOpType: LogicalOperationType.AND | LogicalOperationType.OR = LogicalOperationType.AND,
): IRuleEntitlement.RuleDataStruct {
    const leftOperation: Operation = {
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ERC721,
        chainId: 31337n,
        contractAddress: nft1Address as `0x${string}`,
        threshold: 1n,
    }

    const rightOperation: Operation = {
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ERC721,
        chainId: 31337n,
        contractAddress: nft2Address as `0x${string}`,
        threshold: 1n,
    }
    const root: Operation = {
        opType: OperationType.LOGICAL,
        logicalType: logOpType,
        leftOperation,
        rightOperation,
    }

    return treeToRuleData(root)
}

// Hint: pass in the wallets attached to the providers.
export async function linkWallets(
    rootSpaceDapp: ISpaceDapp,
    rootWallet: ethers.Wallet,
    linkedWallet: ethers.Wallet,
) {
    const walletLink = rootSpaceDapp.getWalletLink()
    let txn: ContractTransaction | undefined
    try {
        txn = await walletLink.linkWalletToRootKey(rootWallet, linkedWallet)
    } catch (err: any) {
        const parsedError = walletLink.parseError(err)
        log('linkWallets error', parsedError)
    }

    expect(txn).toBeDefined()
    const receipt = await txn?.wait()
    expect(receipt!.status).toEqual(1)

    const linkedWallets = await walletLink.getLinkedWallets(rootWallet.address)
    expect(linkedWallets).toContain(linkedWallet.address)
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

export function getNftRuleData(testNftAddress: `0x${string}`): IRuleEntitlement.RuleDataStruct {
    return createExternalNFTStruct([testNftAddress])
}

export interface CreateRoleContext {
    roleId: number | undefined
    error: Error | undefined
}

export async function createRole(
    spaceDapp: ISpaceDapp,
    provider: ethers.providers.Provider,
    spaceId: string,
    roleName: string,
    permissions: Permission[],
    users: string[],
    ruleData: IRuleEntitlement.RuleDataStruct,
    signer: ethers.Signer,
): Promise<CreateRoleContext> {
    let txn: ethers.ContractTransaction | undefined = undefined
    let error: Error | undefined = undefined

    try {
        txn = await spaceDapp.createRole(spaceId, roleName, permissions, users, ruleData, signer)
    } catch (err) {
        error = spaceDapp.parseSpaceError(spaceId, err)
        return { roleId: undefined, error }
    }

    const receipt = await provider.waitForTransaction(txn.hash)
    if (receipt.status === 0) {
        return { roleId: undefined, error: new Error('Transaction failed') }
    }

    const parsedLogs = await spaceDapp.parseSpaceLogs(spaceId, receipt.logs)
    const roleCreatedEvent = parsedLogs.find((log) => log?.name === 'RoleCreated')
    if (!roleCreatedEvent) {
        return { roleId: undefined, error: new Error('RoleCreated event not found') }
    }
    const roleId = (roleCreatedEvent.args[1] as ethers.BigNumber).toNumber()
    return { roleId, error: undefined }
}

export interface CreateChannelContext {
    channelId: string | undefined
    error: Error | undefined
}

export async function createChannel(
    spaceDapp: ISpaceDapp,
    provider: ethers.providers.Provider,
    spaceId: string,
    channelName: string,
    roleIds: number[],
    signer: ethers.Signer,
): Promise<CreateChannelContext> {
    let txn: ethers.ContractTransaction | undefined = undefined
    let error: Error | undefined = undefined

    const channelId = makeUniqueChannelStreamId(spaceId)
    try {
        txn = await spaceDapp.createChannel(spaceId, channelName, '', channelId, roleIds, signer)
    } catch (err) {
        error = spaceDapp.parseSpaceError(spaceId, err)
        return { channelId: undefined, error }
    }

    const receipt = await provider.waitForTransaction(txn.hash)
    if (receipt.status === 0) {
        return { channelId: undefined, error: new Error('Transaction failed') }
    }
    return { channelId, error: undefined }
}
