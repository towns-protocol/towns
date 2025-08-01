import {
    BaseDecryptionExtensions,
    DecryptionEvents,
    DecryptionSessionError,
    DecryptionStatus,
    EncryptedContentItem,
    EntitlementsDelegate,
    EventSignatureBundle,
    GroupSessionsData,
    KeyFulfilmentData,
    KeySolicitationContent,
    KeySolicitationData,
    KeySolicitationItem,
    makeSessionKeys,
} from '../../decryptionExtensions'
import {
    EncryptedData,
    SessionKeysSchema,
    UserInboxPayload_GroupEncryptionSessions,
    UserInboxPayload_GroupEncryptionSessionsSchema,
} from '@towns-protocol/proto'
import {
    GroupEncryptionAlgorithmId,
    GroupEncryptionSession,
    UserDevice,
    UserDeviceCollection,
    CryptoStore,
    GroupEncryptionCrypto,
    IGroupEncryptionClient,
    createCryptoStore,
} from '@towns-protocol/encryption'
import { bin_fromHexString, bin_toHexString, dlog, shortenHexString } from '@towns-protocol/dlog'

import EventEmitter from 'events'
import { Permission } from '@towns-protocol/web3'
import TypedEmitter from 'typed-emitter'
import { customAlphabet } from 'nanoid'
import { create, toJsonString } from '@bufbuild/protobuf'

const log = dlog('test:decryptionExtensions:')

describe.concurrent('TestDecryptionExtensions', () => {
    // test should iterate over all the algorithms
    it.each(Object.values(GroupEncryptionAlgorithmId))(
        'should be able to make key solicitation request',
        async (algorithm) => {
            // arrange
            const clientDiscoveryService: ClientDiscoveryService = {}
            const streamId = genStreamId()
            const alice = genUserId('Alice')
            const bob = genUserId('Bob')
            const bobsPlaintext = "bob's plaintext"
            const { client: aliceClient, decryptionExtension: aliceDex } = await createCryptoMocks(
                alice,
                clientDiscoveryService,
            )
            const { crypto: bobCrypto, decryptionExtension: bobDex } = await createCryptoMocks(
                bob,
                clientDiscoveryService,
            )

            // act
            aliceDex.start()
            // bob starts the decryption extension
            bobDex.start()
            // bob encrypts a message
            const encryptedData = await bobCrypto.encryptGroupEvent(
                streamId,
                new TextEncoder().encode(bobsPlaintext),
                algorithm,
            )
            const encryptedData_V0 = await bobCrypto.encryptGroupEvent_deprecated_v0(
                streamId,
                bobsPlaintext,
                algorithm,
            )
            const sessionId = encryptedData.sessionId
            // alice doesn't have the session key
            // alice sends a key solicitation request
            const keySolicitationData: KeySolicitationContent = {
                deviceKey: aliceDex.userDevice.deviceKey,
                fallbackKey: aliceDex.userDevice.fallbackKey,
                isNewDevice: true,
                sessionIds: [sessionId],
            }
            const keySolicitation = aliceClient.sendKeySolicitation(keySolicitationData)
            // pretend bob receives a key solicitation request from alice, and starts processing it.
            await bobDex.handleKeySolicitationRequest(streamId, '', alice, keySolicitationData, {
                hash: new Uint8Array(),
                signature: new Uint8Array(),
                event: {
                    creatorAddress: new Uint8Array(),
                    delegateSig: new Uint8Array(),
                    delegateExpiryEpochMs: 0n,
                },
            })
            // alice waits for the response
            await keySolicitation
            // after alice gets the session key,

            // try to decrypt the message
            const decrypted = await aliceDex.crypto.decryptGroupEvent(streamId, encryptedData)
            const decrypted_V0 = await aliceDex.crypto.decryptGroupEvent(streamId, encryptedData_V0)

            if (typeof decrypted === 'string') {
                throw new Error('decrypted is a string') // v1 should be bytes
            }
            if (typeof decrypted_V0 !== 'string') {
                throw new Error('decrypted_V0 is a string') // v0 should be bytes
            }

            // stop the decryption extensions
            await bobDex.stop()
            await aliceDex.stop()

            // assert
            expect(new TextDecoder().decode(decrypted)).toBe(bobsPlaintext)
            expect(decrypted_V0).toBe(bobsPlaintext)
            expect(bobDex.seenStates).toContain(DecryptionStatus.working)
            expect(aliceDex.seenStates).toContain(DecryptionStatus.working)
        },
    )

    // test should iterate over all the algorithms
    it.each(Object.values(GroupEncryptionAlgorithmId))(
        'should be able to export/import stream room key',
        async (algorithm) => {
            // arrange
            const clientDiscoveryService: ClientDiscoveryService = {}
            const streamId = genStreamId()
            const alice = genUserId('Alice')
            const bob = genUserId('Bob')
            const bobsPlaintext = "bob's plaintext"
            const { decryptionExtension: aliceDex } = await createCryptoMocks(
                alice,
                clientDiscoveryService,
            )
            const { crypto: bobCrypto, decryptionExtension: bobDex } = await createCryptoMocks(
                bob,
                clientDiscoveryService,
            )

            // act
            aliceDex.start()
            // bob starts the decryption extension
            bobDex.start()
            // bob encrypts a message
            const encryptedData = await bobCrypto.encryptGroupEvent(
                streamId,
                new TextEncoder().encode(bobsPlaintext),
                algorithm,
            )
            const encryptedData_V0 = await bobCrypto.encryptGroupEvent_deprecated_v0(
                streamId,
                bobsPlaintext,
                algorithm,
            )
            // alice doesn't have the session key
            // alice imports the keys exported by bob
            const roomKeys = await bobDex.crypto.exportRoomKeys()
            if (roomKeys) {
                await aliceDex.crypto.importRoomKeys(roomKeys)
            }

            // after alice gets the session key,
            // try to decrypt the message
            const decrypted = await aliceDex.crypto.decryptGroupEvent(streamId, encryptedData)

            if (typeof decrypted === 'string') {
                throw new Error('decrypted is a string') // v1 should be bytes
            }

            const decrypted_V0 = await aliceDex.crypto.decryptGroupEvent(streamId, encryptedData_V0)

            if (typeof decrypted_V0 !== 'string') {
                throw new Error('decrypted_V0 is a string') // v0 should be bytes
            }

            // stop the decryption extensions
            await bobDex.stop()
            await aliceDex.stop()

            // assert
            expect(new TextDecoder().decode(decrypted)).toBe(bobsPlaintext)
            expect(decrypted_V0).toBe(bobsPlaintext)
        },
    )
})

type ReleaseFunction = (value: void | PromiseLike<void>) => void

// given a device key, look up the client
interface ClientDiscoveryService {
    [deviceKey: string]: MockGroupEncryptionClient
}

interface MicroTasks {
    [streamId: string]: MicroTask
}

// given a device key, resolve the key solicitation request
interface SharedKeysResponses {
    [deviceKey: string]: (value: GroupSessionsData | PromiseLike<GroupSessionsData>) => void
}

async function createCryptoMocks(
    userId: string,
    clientDiscoveryService: ClientDiscoveryService,
): Promise<{
    client: MockGroupEncryptionClient
    crypto: GroupEncryptionCrypto
    cryptoStore: CryptoStore
    decryptionExtension: MockDecryptionExtensions
    userDevice: UserDevice
}> {
    const cryptoStore = createCryptoStore(`db_${userId}`, userId)
    const entitlementDelegate = new MockEntitlementsDelegate()
    const client = new MockGroupEncryptionClient(clientDiscoveryService)
    const crypto = new GroupEncryptionCrypto(client, cryptoStore)
    await crypto.init()
    const userDevice: UserDevice = crypto.getUserDevice()
    const decryptionExtension = new MockDecryptionExtensions(
        userId,
        crypto,
        entitlementDelegate,
        userDevice,
        client,
    )
    client.crypto = crypto
    client.decryptionExtensions = decryptionExtension
    clientDiscoveryService[userDevice.deviceKey] = client
    return {
        client,
        crypto,
        cryptoStore,
        decryptionExtension,
        userDevice,
    }
}

class MicroTask {
    private isStarted: boolean = false
    private _isCompleted: boolean = false

    constructor(
        public readonly resolve: ReleaseFunction,
        public readonly startState: DecryptionStatus,
        public readonly endState: DecryptionStatus,
    ) {}

    public get isCompleted(): boolean {
        return this._isCompleted
    }

    public tick(state: DecryptionStatus): void {
        if (state === this.startState) {
            this.isStarted = true
        }
        if (this.isStarted && state === this.endState) {
            this.resolve()
            this._isCompleted = true
        }
    }
}

class MockDecryptionExtensions extends BaseDecryptionExtensions {
    private inProgress: MicroTasks = {}
    private client: MockGroupEncryptionClient
    private _upToDateStreams: Set<string>

    constructor(
        userId: string,
        crypto: GroupEncryptionCrypto,
        entitlementDelegate: EntitlementsDelegate,
        userDevice: UserDevice,
        client: MockGroupEncryptionClient,
    ) {
        const upToDateStreams = new Set<string>()
        const logId = shortenHexString(userId)
        super(client, crypto, entitlementDelegate, userDevice, userId, upToDateStreams, logId, {
            enableEphemeralKeySolicitations: true,
        })
        this._upToDateStreams = upToDateStreams
        this.client = client
        this._onStopFn = () => {
            log('onStopFn')
        }
        client.on('decryptionExtStatusChanged', () => {
            this.statusChangedTick()
        })
    }

    public readonly seenStates: DecryptionStatus[] = []

    public shouldPauseTicking(): boolean {
        return false
    }

    public newGroupSessions(
        sessions: UserInboxPayload_GroupEncryptionSessions,
        senderId: string,
    ): Promise<void> {
        log('newGroupSessions', sessions, senderId)
        const streamId = bin_toHexString(sessions.streamId)
        this.markStreamUpToDate(streamId)
        const p = new Promise<void>((resolve) => {
            this.inProgress[streamId] = new MicroTask(
                resolve,
                DecryptionStatus.working,
                DecryptionStatus.done,
            )
            // start processing the new sessions
            this.enqueueNewGroupSessions(sessions, senderId)
        })
        return p
    }

    public ackNewGroupSession(session: UserInboxPayload_GroupEncryptionSessions): Promise<void> {
        log('newGroupSessionsDone', session.streamId)
        return Promise.resolve()
    }

    public async handleKeySolicitationRequest(
        streamId: string,
        eventHashStr: string,
        fromUserId: string,
        keySolicitation: KeySolicitationContent,
        sigBundle: EventSignatureBundle,
    ): Promise<void> {
        log('keySolicitationRequest', streamId, keySolicitation)
        this.markStreamUpToDate(streamId)
        const p = new Promise<void>((resolve) => {
            this.inProgress[streamId] = new MicroTask(
                resolve,
                DecryptionStatus.working,
                DecryptionStatus.done,
            )
            // start processing the request
            this.enqueueKeySolicitation(
                streamId,
                eventHashStr,
                fromUserId,
                keySolicitation,
                sigBundle,
            )
        })
        return p
    }

    public hasStream(streamId: string): boolean {
        log('canProcessStream', streamId, true)
        return this._upToDateStreams.has(streamId)
    }

    public isValidEvent(item: KeySolicitationItem): { isValid: boolean; reason?: string } {
        log('isValidEvent', item)
        return { isValid: true }
    }

    public decryptGroupEvent(
        _streamId: string,
        _eventId: string,
        _kind: string,
        _encryptedData: EncryptedData,
    ): Promise<void> {
        log('decryptGroupEvent')
        return Promise.resolve()
    }

    public downloadNewMessages(): Promise<void> {
        log('downloadNewMessages')
        return Promise.resolve()
    }

    public getKeySolicitations(_streamId: string): KeySolicitationContent[] {
        log('getKeySolicitations')
        return []
    }

    public isUserEntitledToKeyExchange(_streamId: string, _userId: string): Promise<boolean> {
        log('isUserEntitledToKeyExchange')
        return Promise.resolve(true)
    }

    public onDecryptionError(_item: EncryptedContentItem, _err: DecryptionSessionError): void {
        log('onDecryptionError', 'item:', _item, 'err:', _err)
    }

    public sendKeySolicitation(args: KeySolicitationData): Promise<void> {
        log('sendKeySolicitation', args)
        return Promise.resolve()
    }

    public sendKeyFulfillment(args: KeyFulfilmentData): Promise<{ error?: unknown }> {
        log('sendKeyFulfillment', args)
        return Promise.resolve({})
    }

    public encryptAndShareGroupSessions(args: GroupSessionsData): Promise<void> {
        log('encryptAndSendToGroup')
        return this.client.encryptAndSendMock(args)
    }

    public uploadDeviceKeys(): Promise<void> {
        log('uploadDeviceKeys')
        return Promise.resolve()
    }

    public isUserInboxStreamUpToDate(_upToDateStreams: Set<string>): boolean {
        return true
    }

    public getPriorityForStream(
        _streamId: string,
        _highPriorityIds: Set<string>,
        _recentStreamIds: Set<string>,
    ): number {
        return 0
    }

    private markStreamUpToDate(streamId: string): void {
        this._upToDateStreams.add(streamId)
        this.setStreamUpToDate(streamId)
    }

    private statusChangedTick(): void {
        this.seenStates.push(this.status)
        Object.values(this.inProgress).forEach((t: MicroTask) => {
            t.tick(this.status)
        })
    }
}

class MockGroupEncryptionClient
    extends (EventEmitter as new () => TypedEmitter<DecryptionEvents>)
    implements IGroupEncryptionClient
{
    private shareKeysResponses: SharedKeysResponses = {}

    public constructor(private clientDiscoveryService: ClientDiscoveryService) {
        super()
    }

    public crypto: GroupEncryptionCrypto | undefined
    public decryptionExtensions: MockDecryptionExtensions | undefined

    public get userDevice(): UserDevice | undefined {
        return this.crypto ? this.crypto.getUserDevice() : undefined
    }

    public downloadUserDeviceInfo(
        _userIds: string[],
        _forceDownload: boolean,
    ): Promise<UserDeviceCollection> {
        return Promise.resolve({})
    }

    public encryptAndShareGroupSessions(
        _streamId: string,
        _sessions: GroupEncryptionSession[],
        _devicesInRoom: UserDeviceCollection,
    ): Promise<void> {
        return Promise.resolve()
    }

    public getDevicesInStream(_streamId: string): Promise<UserDeviceCollection> {
        return Promise.resolve({})
    }

    public getMiniblockInfo(
        _streamId: string,
    ): Promise<{ miniblockNum: bigint; miniblockHash: Uint8Array }> {
        return Promise.resolve({ miniblockNum: 0n, miniblockHash: new Uint8Array() })
    }

    public sendKeySolicitation(args: KeySolicitationContent): Promise<GroupSessionsData> {
        // assume the request is sent
        return new Promise((resolve) => {
            // resolve when the response is received
            this.shareKeysResponses[args.deviceKey] = resolve
        })
    }

    public async encryptAndSendMock(args: GroupSessionsData): Promise<void> {
        const { sessions, streamId } = args
        if (!this.userDevice) {
            throw new Error('no user device')
        }

        // prepare the common parts of the payload
        const streamIdBytes = streamIdToBytes(streamId)
        const sessionIds = sessions.map((s) => s.sessionId)
        const payload = toJsonString(SessionKeysSchema, makeSessionKeys(sessions))

        // encrypt and send the payload to each client
        const otherClients = Object.values(this.clientDiscoveryService).filter(
            (c) => c.userDevice?.deviceKey != this.userDevice?.deviceKey,
        )
        const promises = otherClients.map(async (c) => {
            const cipertext = await this.crypto?.encryptWithDeviceKeys(payload, [c.userDevice!])
            const groupSession: UserInboxPayload_GroupEncryptionSessions = create(
                UserInboxPayload_GroupEncryptionSessionsSchema,
                {
                    streamId: streamIdBytes,
                    senderKey: this.userDevice?.deviceKey,
                    sessionIds: sessionIds,
                    ciphertexts: cipertext,
                    algorithm: args.algorithm,
                },
            )
            // pretend sending the payload to the client
            // ....
            // pretend receiving the response
            // trigger a new group session processing
            await c.decryptionExtensions?.newGroupSessions(groupSession, this.userDevice!.deviceKey)
            await c.resolveGroupSessionResponse(args)
        })

        await Promise.all(promises)
    }

    public resolveGroupSessionResponse(args: GroupSessionsData): Promise<void> {
        // fake receiving the response
        const resolve = this.shareKeysResponses[args.item.solicitation.deviceKey]
        if (resolve) {
            resolve(args)
        }
        return Promise.resolve()
    }

    public sendKeyFulfillment(_args: KeyFulfilmentData): Promise<{ error?: unknown }> {
        return Promise.resolve({})
    }

    public uploadDeviceKeys(): Promise<void> {
        return Promise.resolve()
    }
}

class MockEntitlementsDelegate implements EntitlementsDelegate {
    public isEntitled(
        _spaceId: string | undefined,
        _channelId: string | undefined,
        _user: string,
        _permission: Permission,
    ): Promise<boolean> {
        return Promise.resolve(true)
    }
}

function genUserId(name: string): string {
    return `0x${name}${Date.now()}`
}

function genStreamId(): string {
    const hexNanoId = customAlphabet('0123456789abcdef', 64)
    return hexNanoId()
}

function streamIdToBytes(streamId: string): Uint8Array {
    return bin_fromHexString(streamId)
}
