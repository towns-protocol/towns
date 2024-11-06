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
import { Entitlements } from './sync-agent/entitlements/entitlements'
import { PlainMessage } from '@bufbuild/protobuf'
import { IStreamStateView } from './streamStateView'
import { Client } from './client'
import {
    makeBaseChainConfig,
    makeRiverChainConfig,
    makeRiverConfig,
    useLegacySpaces,
} from './riverConfig'
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
import { StreamRpcClient, makeStreamRpcClient } from './makeStreamRpcClient'
import assert from 'assert'
import _ from 'lodash'
import { MockEntitlementsDelegate } from './utils'
import { SignerContext, makeSignerContext } from './signerContext'
import {
    Address,
    LocalhostWeb3Provider,
    PricingModuleStruct,
    createExternalNFTStruct,
    createRiverRegistry,
    createSpaceDapp,
    IRuleEntitlementBase,
    Permission,
    ISpaceDapp,
    LegacyMembershipStruct,
    MembershipStruct,
    isLegacyMembershipType,
    ETH_ADDRESS,
    NoopRuleData,
    CheckOperationType,
    LogicalOperationType,
    Operation,
    OperationType,
    treeToRuleData,
    SpaceDapp,
    TestERC20,
    TestERC1155,
    TestCrossChainEntitlement,
    CreateSpaceParams,
    CreateLegacySpaceParams,
    isCreateLegacySpaceParams,
    convertRuleDataV1ToV2,
    encodeRuleDataV2,
    SignerType,
    IRuleEntitlementV2Base,
    isRuleDataV1,
    encodeThresholdParams,
    encodeERC1155Params,
    convertRuleDataV2ToV1,
    XchainConfig,
    UpdateRoleParams,
} from '@river-build/web3'
import { SyncState } from './syncedStreamsLoop'

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

export const getXchainConfigForTesting = (): XchainConfig => {
    // TODO: generate this for test environment and read from it
    return {
        supportedRpcUrls: {
            31337: 'http://127.0.0.1:8545',
            31338: 'http://127.0.0.1:8546',
        },
        etherBasedChains: [31337, 31338],
    }
}

export async function erc1155CheckOp(
    contractName: string,
    tokenId: bigint,
    threshold: bigint,
): Promise<Operation> {
    const contractAddress = await TestERC1155.getContractAddress(contractName)
    return {
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ERC1155,
        chainId: 31337n,
        contractAddress,
        params: encodeERC1155Params({ threshold, tokenId }),
    }
}

export async function erc20CheckOp(contractName: string, threshold: bigint): Promise<Operation> {
    const contractAddress = await TestERC20.getContractAddress(contractName)
    return {
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ERC20,
        chainId: 31337n,
        contractAddress,
        params: encodeThresholdParams({ threshold }),
    }
}

export async function mockCrossChainCheckOp(contractName: string, id: bigint): Promise<Operation> {
    const contractAddress = await TestCrossChainEntitlement.getContractAddress(contractName)
    return {
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ISENTITLED,
        chainId: 31337n,
        contractAddress,
        params: TestCrossChainEntitlement.encodeIdParameter(id),
    }
}

export const twoEth = BigInt(2e18)
export const oneEth = BigInt(1e18)
export const threeEth = BigInt(3e18)
export const oneHalfEth = BigInt(5e17)

export function ethBalanceCheckOp(threshold: bigint): Operation {
    return {
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ETH_BALANCE,
        chainId: 31337n,
        contractAddress: ethers.constants.AddressZero,
        params: encodeThresholdParams({ threshold }),
    }
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

    const [alicesContext, bobsContext, carolsContext] = await Promise.all([
        makeUserContextFromWallet(alicesWallet),
        makeUserContextFromWallet(bobsWallet),
        makeUserContextFromWallet(carolsWallet),
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
    const riverConfig = makeRiverConfig()
    const [alice, bob, carol] = await Promise.all([
        makeTestClient({
            context: alicesContext,
            deviceId: 'alice',
            entitlementsDelegate: new Entitlements(riverConfig, aliceSpaceDapp as SpaceDapp),
        }),
        makeTestClient({
            context: bobsContext,
            entitlementsDelegate: new Entitlements(riverConfig, bobSpaceDapp as SpaceDapp),
        }),
        makeTestClient({
            context: carolsContext,
            entitlementsDelegate: new Entitlements(riverConfig, carolSpaceDapp as SpaceDapp),
        }),
    ])

    return {
        alice,
        bob,
        carol,
        alicesWallet,
        bobsWallet,
        carolsWallet,
        alicesContext,
        bobsContext,
        carolsContext,
        aliceProvider,
        bobProvider,
        carolProvider,
        aliceSpaceDapp,
        bobSpaceDapp,
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

export const sendFlush = async (client: StreamRpcClient): Promise<void> => {
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
    membership: LegacyMembershipStruct | MembershipStruct,
): Promise<{
    spaceId: string
    defaultChannelId: string
    userStreamView: IStreamStateView
}> {
    const transaction = await createVersionedSpaceFromMembership(
        client,
        spaceDapp,
        wallet,
        name,
        membership,
    )
    const receipt = await transaction.wait()
    expect(receipt.status).toEqual(1)
    const spaceAddress = spaceDapp.getSpaceAddress(receipt, wallet.address)
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

export async function createVersionedSpaceFromMembership(
    client: Client,
    spaceDapp: ISpaceDapp,
    wallet: ethers.Wallet,
    name: string,
    membership: LegacyMembershipStruct | MembershipStruct,
): Promise<ethers.ContractTransaction> {
    if (useLegacySpaces() && isLegacyMembershipType(membership)) {
        return await spaceDapp.createLegacySpace(
            {
                spaceName: `${name}-space`,
                uri: `${name}-space-metadata`,
                channelName: 'general',
                membership,
            },
            wallet,
        )
    } else {
        if (isLegacyMembershipType(membership)) {
            // Convert legacy space params to current space params
            membership = {
                settings: membership.settings,
                permissions: membership.permissions,
                requirements: {
                    everyone: membership.requirements.everyone,
                    users: [],
                    syncEntitlements: false,
                    ruleData: encodeRuleDataV2(
                        convertRuleDataV1ToV2(
                            membership.requirements.ruleData as IRuleEntitlementBase.RuleDataStruct,
                        ),
                    ),
                },
            }
        }
        return await spaceDapp.createSpace(
            {
                spaceName: `${name}-space`,
                uri: `${name}-space-metadata`,
                channelName: 'general',
                membership,
            },
            wallet,
        )
    }
}

// createVersionedSpace accepts either legacy or current space creation parameters and will
// fall backto the legacy space creation endpoint on the spaceDapp if the appropriate flag is set.
// If a user does not pass in a legacy space creation parameter, the function will not use
// the legacy space creation endpoint, because the updated parameters are not backwards
// compatible - we don't attempt conversion here.
export async function createVersionedSpace(
    spaceDapp: ISpaceDapp,
    createSpaceParams: CreateSpaceParams | CreateLegacySpaceParams,
    signer: SignerType,
): Promise<ethers.ContractTransaction> {
    if (useLegacySpaces() && isCreateLegacySpaceParams(createSpaceParams)) {
        return await spaceDapp.createLegacySpace(createSpaceParams, signer)
    } else {
        if (isCreateLegacySpaceParams(createSpaceParams)) {
            // Convert legacy space params to current space params
            createSpaceParams = {
                spaceName: createSpaceParams.spaceName,
                uri: createSpaceParams.uri,
                channelName: createSpaceParams.channelName,
                membership: {
                    settings: createSpaceParams.membership.settings,
                    permissions: createSpaceParams.membership.permissions,
                    requirements: {
                        everyone: createSpaceParams.membership.requirements.everyone,
                        users: [],
                        syncEntitlements: false,
                        ruleData: encodeRuleDataV2(
                            convertRuleDataV1ToV2(
                                createSpaceParams.membership.requirements
                                    .ruleData as IRuleEntitlementBase.RuleDataStruct,
                            ),
                        ),
                    },
                },
            }
        }
        return await spaceDapp.createSpace(createSpaceParams, signer)
    }
}

// createUserStreamAndSyncClient creates a user stream for a given client that
// uses a newly created space as the hint for the user stream, since the stream
// node will not allow the creation of a user stream without a space id.
//
// If the membership info is a legacy membership struct and the legacy space flag
// is set, the function will create a legacy space. Otherwise, it will convert the
// legacy membership struct to a current membership struct if needed and use the
// latest space creation endpoint.
export async function createUserStreamAndSyncClient(
    client: Client,
    spaceDapp: ISpaceDapp,
    name: string,
    membershipInfo: LegacyMembershipStruct | MembershipStruct,
    wallet: ethers.Wallet,
) {
    let createSpaceParams: CreateSpaceParams | CreateLegacySpaceParams
    if (isLegacyMembershipType(membershipInfo)) {
        createSpaceParams = {
            spaceName: `${name}-space`,
            uri: `${name}-space-metadata`,
            channelName: 'general',
            membership: membershipInfo,
        }
    } else {
        createSpaceParams = {
            spaceName: `${name}-space`,
            uri: `${name}-space-metadata`,
            channelName: 'general',
            membership: membershipInfo,
        }
    }
    const transaction = await createVersionedSpace(spaceDapp, createSpaceParams, wallet)
    const receipt = await transaction.wait()
    expect(receipt.status).toEqual(1)
    const spaceAddress = spaceDapp.getSpaceAddress(receipt, wallet.address)
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

    // Check that the local evaluation of the user's entitlements for joining the space
    // passes.
    const entitledWallet = await spaceDapp.getEntitledWalletForJoiningSpace(
        spaceId,
        address,
        getXchainConfigForTesting(),
    )
    expect(entitledWallet).toBeDefined()

    const { issued } = await spaceDapp.joinSpace(spaceId, address, wallet)
    expect(issued).toBeTrue()
    log(`${name} joined space ${spaceId}`, Date.now() - joinStart)

    await client.initializeUser({ spaceId })
    client.startSync()

    await waitFor(() => client.streams.syncState === SyncState.Syncing)

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
): Promise<LegacyMembershipStruct> {
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
            syncEntitlements: false,
        },
    }
}

export function twoNftRuleData(
    nft1Address: string,
    nft2Address: string,
    logOpType: LogicalOperationType.AND | LogicalOperationType.OR = LogicalOperationType.AND,
): IRuleEntitlementV2Base.RuleDataV2Struct {
    const leftOperation: Operation = {
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ERC721,
        chainId: 31337n,
        contractAddress: nft1Address as Address,
        params: encodeThresholdParams({ threshold: 1n }),
    }

    const rightOperation: Operation = {
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ERC721,
        chainId: 31337n,
        contractAddress: nft2Address as Address,
        params: encodeThresholdParams({ threshold: 1n }),
    }
    const root: Operation = {
        opType: OperationType.LOGICAL,
        logicalType: logOpType,
        leftOperation,
        rightOperation,
    }

    return treeToRuleData(root)
}

export async function unlinkCaller(
    rootSpaceDapp: ISpaceDapp,
    rootWallet: ethers.Wallet,
    caller: ethers.Wallet,
) {
    const walletLink = rootSpaceDapp.getWalletLink()
    let txn: ContractTransaction | undefined
    try {
        txn = await walletLink.removeCallerLink(caller)
    } catch (err: any) {
        const parsedError = walletLink.parseError(err)
        log('linkWallets error', parsedError)
    }

    expect(txn).toBeDefined()
    const receipt = await txn?.wait()
    expect(receipt!.status).toEqual(1)

    const linkedWallets = await walletLink.getLinkedWallets(rootWallet.address)
    expect(linkedWallets).not.toContain(caller.address)
}

export async function unlinkWallet(
    rootSpaceDapp: ISpaceDapp,
    rootWallet: ethers.Wallet,
    linkedWallet: ethers.Wallet,
) {
    const walletLink = rootSpaceDapp.getWalletLink()
    let txn: ContractTransaction | undefined
    try {
        txn = await walletLink.removeLink(rootWallet, linkedWallet.address)
    } catch (err: any) {
        const parsedError = walletLink.parseError(err)
        log('linkWallets error', parsedError)
    }

    expect(txn).toBeDefined()
    const receipt = await txn?.wait()
    expect(receipt!.status).toEqual(1)

    const linkedWallets = await walletLink.getLinkedWallets(rootWallet.address)
    expect(linkedWallets).not.toContain(linkedWallet.address)
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
                const env = await unpackStreamEnvelopes(stream, undefined)
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

export const TIERED_PRICING_ORACLE = 'TieredLogPricingOracleV2'
export const FIXED_PRICING = 'FixedPricing'

export const getDynamicPricingModule = (pricingModules: PricingModuleStruct[]) => {
    return pricingModules.find((module) => module.name === TIERED_PRICING_ORACLE)
}

export const getFixedPricingModule = (pricingModules: PricingModuleStruct[]) => {
    return pricingModules.find((module) => module.name === FIXED_PRICING)
}

export function getNftRuleData(testNftAddress: Address): IRuleEntitlementV2Base.RuleDataV2Struct {
    return createExternalNFTStruct([testNftAddress])
}

export interface CreateRoleContext {
    roleId: number | undefined
    error: Error | undefined
}

// createRole creates a role on the spaceDapp with the given parameters, using the legacy endpoint
// if the USE_LEGACY_SPACES environment variable is set and converting the ruleData into the correct
// format as necessary. Be aware, though, that the legacy endpoint does not support erc1155 checks.
export async function createRole(
    spaceDapp: ISpaceDapp,
    provider: ethers.providers.Provider,
    spaceId: string,
    roleName: string,
    permissions: Permission[],
    users: string[],
    ruleData: IRuleEntitlementBase.RuleDataStruct | IRuleEntitlementV2Base.RuleDataV2Struct,
    signer: ethers.Signer,
): Promise<CreateRoleContext> {
    let txn: ethers.ContractTransaction | undefined = undefined
    let error: Error | undefined = undefined
    if (useLegacySpaces()) {
        try {
            if (!isRuleDataV1(ruleData)) {
                ruleData = convertRuleDataV2ToV1(ruleData)
            }
            txn = await spaceDapp.legacyCreateRole(
                spaceId,
                roleName,
                permissions,
                users,
                ruleData,
                signer,
            )
        } catch (err) {
            error = spaceDapp.parseSpaceError(spaceId, err)
            return { roleId: undefined, error }
        }
    } else {
        if (isRuleDataV1(ruleData)) {
            ruleData = convertRuleDataV1ToV2(ruleData)
        }
        try {
            txn = await spaceDapp.createRole(
                spaceId,
                roleName,
                permissions,
                users,
                ruleData,
                signer,
            )
        } catch (err) {
            error = spaceDapp.parseSpaceError(spaceId, err)
            return { roleId: undefined, error }
        }
    }

    const { roleId, error: roleError } = await spaceDapp.waitForRoleCreated(spaceId, txn)
    return { roleId, error: roleError }
}

export interface UpdateRoleContext {
    error: Error | undefined
}

export async function updateRole(
    spaceDapp: ISpaceDapp,
    provider: ethers.providers.Provider,
    params: UpdateRoleParams,
    signer: ethers.Signer,
): Promise<UpdateRoleContext> {
    let txn: ethers.ContractTransaction | undefined = undefined
    let error: Error | undefined = undefined
    if (useLegacySpaces()) {
        throw new Error('updateRole is v2 only')
    }
    try {
        txn = await spaceDapp.updateRole(params, signer)
    } catch (err) {
        error = spaceDapp.parseSpaceError(params.spaceNetworkId, err)
        return { error }
    }

    const receipt = await provider.waitForTransaction(txn.hash)
    if (receipt.status === 0) {
        return { error: new Error('Transaction failed') }
    }

    return { error: undefined }
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

// Type guard function based on field checks
export function isEncryptedData(obj: unknown): obj is EncryptedData {
    if (typeof obj !== 'object' || obj === null) {
        return false
    }

    const data = obj as EncryptedData
    return (
        typeof data.ciphertext === 'string' &&
        typeof data.algorithm === 'string' &&
        typeof data.senderKey === 'string' &&
        typeof data.sessionId === 'string' &&
        (typeof data.checksum === 'string' || data.checksum === undefined) &&
        (typeof data.refEventId === 'string' || data.refEventId === undefined)
    )
}

// Users need to be mapped from 'alice', 'bob', etc to their wallet addresses,
// because the wallets are created within this helper method.
export async function createTownWithRequirements(requirements: {
    everyone: boolean
    users: string[]
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct
}) {
    const {
        alice,
        bob,
        carol,
        aliceSpaceDapp,
        bobSpaceDapp,
        carolSpaceDapp,
        aliceProvider,
        bobProvider,
        carolProvider,
        alicesWallet,
        bobsWallet,
        carolsWallet,
    } = await setupWalletsAndContexts()

    const pricingModules = await bobSpaceDapp.listPricingModules()
    const dynamicPricingModule = getDynamicPricingModule(pricingModules)
    expect(dynamicPricingModule).toBeDefined()

    const userNameToWallet: Record<string, string> = {
        alice: alicesWallet.address,
        bob: bobsWallet.address,
        carol: carolsWallet.address,
    }
    requirements.users = requirements.users.map((user) => userNameToWallet[user])

    const membershipInfo: MembershipStruct = {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 1000,
            duration: 0,
            currency: ETH_ADDRESS,
            feeRecipient: bob.userId,
            freeAllocation: 0,
            pricingModule: dynamicPricingModule!.module,
        },
        permissions: [Permission.Read, Permission.Write],
        requirements: {
            everyone: requirements.everyone,
            users: requirements.users,
            ruleData: encodeRuleDataV2(requirements.ruleData),
            syncEntitlements: false,
        },
    }

    // This helper method validates that the owner can join the space and default channel.
    const {
        spaceId,
        defaultChannelId: channelId,
        userStreamView: bobUserStreamView,
    } = await createSpaceAndDefaultChannel(
        bob,
        bobSpaceDapp,
        bobProvider.wallet,
        'bobs',
        membershipInfo,
    )

    // Validate that owner passes entitlement check
    const entitledWallet = await bobSpaceDapp.getEntitledWalletForJoiningSpace(
        spaceId,
        bobsWallet.address,
        getXchainConfigForTesting(),
    )
    expect(entitledWallet).toBeDefined()

    return {
        alice,
        bob,
        carol,
        aliceSpaceDapp,
        bobSpaceDapp,
        carolSpaceDapp,
        aliceProvider,
        bobProvider,
        carolProvider,
        alicesWallet,
        bobsWallet,
        carolsWallet,
        spaceId,
        channelId,
        bobUserStreamView,
    }
}

export async function expectUserCannotJoinSpace(
    spaceId: string,
    client: Client,
    spaceDapp: ISpaceDapp,
    address: string,
) {
    // Check that the local evaluation of the user's entitlements for joining the space
    // fails.
    const entitledWallet = await spaceDapp.getEntitledWalletForJoiningSpace(
        spaceId,
        address,
        getXchainConfigForTesting(),
    )
    expect(entitledWallet).toBeUndefined()
    await expect(client.joinStream(spaceId)).rejects.toThrow(/PERMISSION_DENIED/)
}

// pass in users as 'alice', 'bob', 'carol' - b/c their wallets are created here
export async function setupChannelWithCustomRole(
    userNames: string[],
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
    permissions: Permission[] = [Permission.Read],
) {
    const {
        alice,
        bob,
        carol,
        alicesWallet,
        bobsWallet,
        carolsWallet,
        aliceProvider,
        bobProvider,
        carolProvider,
        aliceSpaceDapp,
        bobSpaceDapp,
        carolSpaceDapp,
    } = await setupWalletsAndContexts()

    const userNameToWallet: Record<string, string> = {
        alice: alicesWallet.address,
        bob: bobsWallet.address,
        carol: carolsWallet.address,
    }
    const users = userNames.map((user) => userNameToWallet[user])

    const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
        bob,
        bobSpaceDapp,
        bobProvider.wallet,
        'bob',
        await everyoneMembershipStruct(bobSpaceDapp, bob),
    )

    const { roleId, error: roleError } = await createRole(
        bobSpaceDapp,
        bobProvider,
        spaceId,
        'gated role',
        permissions,
        users,
        ruleData,
        bobProvider.wallet,
    )
    expect(roleError).toBeUndefined()
    log('roleId', roleId)

    // Create a channel gated by the above role in the space contract.
    const { channelId, error: channelError } = await createChannel(
        bobSpaceDapp,
        bobProvider,
        spaceId,
        'custom-role-gated-channel',
        [roleId!.valueOf()],
        bobProvider.wallet,
    )
    expect(channelError).toBeUndefined()
    log('channelId', channelId)

    // Then, establish a stream for the channel on the river node.
    const { streamId: channelStreamId } = await bob.createChannel(
        spaceId,
        'nft-gated-channel',
        'talk about nfts here',
        channelId!,
    )
    expect(channelStreamId).toEqual(channelId)
    // As the space owner, Bob should always be able to join the channel regardless of the custom role.
    await expect(bob.joinStream(channelId!)).toResolve()

    // Join alice to the town so she can attempt to join the role-gated channel.
    // Alice should have no issue joining the space and default channel for an "everyone" town.
    await expectUserCanJoin(
        spaceId,
        defaultChannelId,
        'alice',
        alice,
        aliceSpaceDapp,
        alicesWallet.address,
        aliceProvider.wallet,
    )

    // Add carol to the space also so she can attempt to join role-gated channels.
    await expectUserCanJoin(
        spaceId,
        defaultChannelId,
        'carol',
        carol,
        carolSpaceDapp,
        carolsWallet.address,
        carolProvider.wallet,
    )

    return {
        alice,
        bob,
        carol,
        alicesWallet,
        bobsWallet,
        carolsWallet,
        aliceProvider,
        bobProvider,
        carolProvider,
        aliceSpaceDapp,
        bobSpaceDapp,
        carolSpaceDapp,
        spaceId,
        defaultChannelId,
        channelId,
        roleId,
    }
}

export async function expectUserCanJoinChannel(
    client: Client,
    spaceDapp: ISpaceDapp,
    spaceId: string,
    channelId: string,
) {
    // Space dapp should evaluate the user as entitled to the channel
    await expect(
        spaceDapp.isEntitledToChannel(
            spaceId,
            channelId,
            client.userId,
            Permission.Read,
            getXchainConfigForTesting(),
        ),
    ).resolves.toBeTruthy()

    // Stream node should allow the join
    await expect(client.joinStream(channelId)).toResolve()
    const userStreamView = (await client.waitForStream(makeUserStreamId(client.userId))!).view
    // Wait for alice's user stream to have the join
    await waitFor(() => userStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN))
}

export async function expectUserCannotJoinChannel(
    client: Client,
    spaceDapp: ISpaceDapp,
    spaceId: string,
    channelId: string,
) {
    // Space dapp should evaluate the user as not entitled to the channel
    await expect(
        spaceDapp.isEntitledToChannel(
            spaceId,
            channelId,
            client.userId,
            Permission.Read,
            getXchainConfigForTesting(),
        ),
    ).resolves.toBeFalsy()

    // Stream node should not allow the join
    await expect(client.joinStream(channelId)).rejects.toThrow(/7:PERMISSION_DENIED/)
}
