// TODO(HNT-1380): looks like browser supports async sign, but nodejs doesn't by default
// Figure out if async sign should be used everywhere.

import { dlog } from '../dlog'
import { assertBytes } from 'ethereum-cryptography/utils'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { recoverPublicKey, signSync, verify } from 'ethereum-cryptography/secp256k1'
import { check } from '../check'
import { RiverEvent, IClearEvent, EncryptedEventStreamTypes, RiverEventType } from '../event'
import { Client } from '../client'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import {
    OLM_ALGORITHM,
    MEGOLM_ALGORITHM,
    encryptMessageForDevice,
    ensureOlmSessionsForDevices,
    IOlmSessionResult,
    IOlmEncryptedContent,
} from './olmLib'
import { OlmMegolmDelegate } from '@river/mecholm'
import { DeviceInfo, ISignatures, ToDeviceBatch } from './deviceInfo'
import { OlmDevice, IInitOpts } from './olmDevice'
import {
    EncryptedDeviceData,
    Err,
    MegolmSession,
    ToDeviceOp,
    UserPayload_ToDevice,
} from '@river/proto'
import { IFallbackKey, recursiveMapToObject } from '../types'
import { bin_fromHexString } from '../binary'
import { DeviceList, IOlmDevice } from './deviceList'
import { ethers } from 'ethers'
import { CryptoStore } from './store/base'
import {
    DecryptionAlgorithm,
    EncryptionAlgorithm,
    DecryptionError,
    DECRYPTION_CLASSES,
    ENCRYPTION_CLASSES,
    registerAlgorithm,
} from './algorithms/base'
import { OlmDecryption, OlmEncryption } from './algorithms/olm'
import { MegolmDecryption, MegolmEncryption } from './algorithms/megolm'
import { PlainMessage } from '@bufbuild/protobuf'

const log = dlog('csb:crypto')

// Create hash header as Uint8Array from string 'CSBLANCA'
const HASH_HEADER = new Uint8Array([67, 83, 66, 76, 65, 78, 67, 65])
// Create hash separator as Uint8Array from string 'ABCDEFG>'
const HASH_SEPARATOR = new Uint8Array([65, 66, 67, 68, 69, 70, 71, 62])
// Create hash footer as Uint8Array from string '<GFEDCBA'
const HASH_FOOTER = new Uint8Array([60, 71, 70, 69, 68, 67, 66, 65])

const numberToUint8Array64LE = (num: number): Uint8Array => {
    const result = new Uint8Array(8)
    for (let i = 0; num != 0; i++, num = num >>> 8) {
        result[i] = num & 0xff
    }
    return result
}

const pushByteToUint8Array = (arr: Uint8Array, byte: number): Uint8Array => {
    const ret = new Uint8Array(arr.length + 1)
    ret.set(arr)
    ret[arr.length] = byte
    return ret
}

export const checkSignature = (signature: Uint8Array) => assertBytes(signature, 65)
export const checkHash = (hash: Uint8Array) => assertBytes(hash, 32)

export const townsHash = (data: Uint8Array): Uint8Array => {
    assertBytes(data)
    const hasher = keccak256.create()
    hasher.update(HASH_HEADER)
    hasher.update(numberToUint8Array64LE(data.length))
    hasher.update(HASH_SEPARATOR)
    hasher.update(data)
    hasher.update(HASH_FOOTER)
    return hasher.digest()
}

export const townsSign = async (
    hash: Uint8Array,
    privateKey: Uint8Array | string,
): Promise<Uint8Array> => {
    checkHash(hash)
    // TODO(HNT-1380): why async sign doesn't work in node? Use async sign in the browser, sync sign in node?
    const [sig, recovery] = signSync(hash, privateKey, { recovered: true, der: false })
    return pushByteToUint8Array(sig, recovery)
}

/**
 * Represents a received r.room_key_request event
 */
export class IncomingRoomKeyRequest {
    /** user requesting the key */
    public readonly userId: string
    /** device requesting the key */
    public readonly deviceId: string
    /** unique id for the request */
    public readonly requestId: string
    public readonly requestBody: IRoomKeyRequestBody | undefined
    /**
     * callback which, when called, will ask
     *    the relevant crypto algorithm implementation to share the keys for
     *    this request.
     */
    public share: () => void

    public constructor(event: RiverEvent) {
        const content = event.getContent()

        this.userId = event.getSender()
        this.deviceId = content.requesting_device_id ?? ''
        this.requestId = content.request_id ?? ''
        this.requestBody = content.request_body
        this.share = (): void => {
            throw new Error("don't know how to share keys for this request yet")
        }
    }
}

export const townsVerifySignature = (
    hash: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array | string,
): boolean => {
    checkHash(hash)
    checkSignature(signature)
    return verify(signature.slice(0, 64), hash, publicKey)
}

export const townsRecoverPubKey = (hash: Uint8Array, signature: Uint8Array): Uint8Array => {
    checkHash(hash)
    checkSignature(signature)
    return recoverPublicKey(hash, signature.slice(0, 64), signature[64])
}

export const publicKeyToAddress = (publicKey: Uint8Array): Uint8Array => {
    assertBytes(publicKey, 64, 65)
    if (publicKey.length === 65) {
        publicKey = publicKey.slice(1)
    }
    return keccak256(publicKey).slice(-20)
}

export const publicKeyToUint8Array = (publicKey: string): Uint8Array => {
    // Uncompressed public key in string form should start with '0x04'.
    check(
        typeof publicKey === 'string' && publicKey.startsWith('0x04') && publicKey.length === 132,
        'Bad public key',
        Err.BAD_PUBLIC_KEY,
    )
    return bin_fromHexString(publicKey)
}

export const makeTownsDelegateSig = async (
    userPrivateKey: () => Uint8Array | string,
    devicePubKey: Uint8Array,
): Promise<Uint8Array> => {
    const hash = townsHash(devicePubKey)
    check(devicePubKey.length === 65, 'Bad public key', Err.BAD_PUBLIC_KEY)
    return townsSign(hash, userPrivateKey())
}

// TODO(HNT-1380): once we switch to the new signing model, remove this function
export const makeOldTownsDelegateSig = async (
    primaryWallet: ethers.Signer,
    devicePubKey: Uint8Array | string,
): Promise<Uint8Array> => {
    if (typeof devicePubKey === 'string') {
        devicePubKey = publicKeyToUint8Array(devicePubKey)
    }
    check(devicePubKey.length === 65, 'Bad public key', Err.BAD_PUBLIC_KEY)
    return bin_fromHexString(await primaryWallet.signMessage(devicePubKey))
}

/**
 * The result of a successful call to Crypto.decryptEvent
 */
export interface IEventDecryptionResult {
    /**
     * The plaintext payload for the event (typically containing <tt>type</tt> and <tt>content</tt> fields).
     */
    clearEvent: IClearEvent
    /**
     * List of curve25519 keys involved in telling us about the senderCurve25519Key and claimedDoNotUseKey.
     */
    forwardingCurve25519KeyChain?: string[]
    /**
     * Key owned by the sender of this event.
     */
    senderCurve25519Key?: string
    /**
     * signing key claimed by the sender of this event.
     */
    claimedDoNotUseKey?: string
    /**
     * The sender doesn't authorize the unverified devices to decrypt his messages
     */
    encryptedDisabledForUnverifiedDevices?: boolean
}

export interface IEncryptionUserTarget {
    userIds: string[]
}

export interface IEncryptionRoomTarget {
    channelId: string
}

export type EncryptionTarget = IEncryptionUserTarget | IEncryptionRoomTarget

function isUserTarget(target: EncryptionTarget): target is IEncryptionUserTarget {
    return 'userIds' in target
}

interface IRoomKey {
    channel_id: string
    algorithm: string
}

/**
 * The parameters of a room key request
 */
export interface IRoomKeyRequestBody extends IRoomKey {
    session_id: string
    sender_key: string
}

export interface IRoomKeyRequestRecipient {
    userId: string
    deviceId: string
}

export enum CryptoEvent {
    DeviceVerificationChanged = 'deviceVerificationChanged',
    WillUpdateDevices = 'crypto.willUpdateDevices',
    DevicesUpdated = 'crypto.devicesUpdated',
}

export interface IImportOpts {
    stage: string // TODO: Enum
    successes: number
    failures: number
    total: number
}

export interface IImportRoomKeysOpts {
    /** called with an object that has a "stage" param */
    progressCallback?: (stage: IImportOpts) => void
    untrusted?: boolean
    source?: string // TODO: Enum
}

export type CryptoEventHandlerMap = {
    /**
     * Fires whenever a device is marked as verified|unverified|blocked|unblocked
     */
    [CryptoEvent.DeviceVerificationChanged]: (
        userId: string,
        deviceId: string,
        device: DeviceInfo,
    ) => void
    /**
     * Fires whenever the stored devices for a user will be updated
     */
    [CryptoEvent.WillUpdateDevices]: (users: string[], initialFetch: boolean) => void
    /**
     * Fires whenever the stored devices for a user have changed
     */
    [CryptoEvent.DevicesUpdated]: (users: string[], initialFetch: boolean) => void
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CryptoBackend {
    // TODO: add common interface for crypto implementations
    /**
     * Shut down any background processes related to crypto
     */
    stop(): void

    /**
     * @param event -  event to be sent
     * @param target - encryption target (either userIds or roomId)
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    encryptEvent(event: RiverEvent, target: EncryptionTarget): Promise<void>

    /**
     * Decrypt a received event
     *
     * @returns a promise which resolves once we have finished decrypting.
     * Rejects with an error if there is a problem decrypting the event.
     */
    decryptEvent(event: RiverEvent): Promise<IEventDecryptionResult>
}

interface ISignableObject {
    signatures?: ISignatures
    unsigned?: object
}

export class Crypto
    extends (EventEmitter as new () => TypedEmitter<CryptoEventHandlerMap>)
    implements CryptoBackend
{
    public deviceKeys: Record<string, string> = {}
    private olmDelegate: OlmMegolmDelegate | undefined

    public readonly supportedAlgorithms: string[]
    public readonly olmDevice: OlmDevice
    public readonly deviceList: DeviceList

    public readonly streamEncryptors = new Map<string, EncryptionAlgorithm>()
    public readonly decryptors = new Map<string, DecryptionAlgorithm>()

    public globalBlacklistUnverifiedDevices = false
    public globalErrorOnUnknownDevices = true
    // device_id -> map ( algo_key_id: { key, signatures: { key: sig}})
    private fallbackKeys: Record<string, Record<string, IFallbackKey>> = {}

    public constructor(
        public readonly client: Client,
        public readonly userId: string,
        public readonly deviceId: string,
        public readonly cryptoStore: CryptoStore,
    ) {
        super()
        // jterzis 05/05/23: this list is probably close to the actual list, but also tentative until confirmed.
        // todo: implement olmDevice instantiation
        // initialize Olm library
        this.olmDelegate = new OlmMegolmDelegate()
        // olm lib returns a Promise<void> on init, hence the catch if it rejects
        this.olmDelegate.init().catch((e) => {
            log('error initializing olm', e)
            throw e
        })
        this.olmDevice = new OlmDevice(cryptoStore, this.olmDelegate)
        this.deviceList = new DeviceList(this.client, cryptoStore, this.olmDevice)
        registerAlgorithm(OLM_ALGORITHM, OlmEncryption, OlmDecryption)
        registerAlgorithm(MEGOLM_ALGORITHM, MegolmEncryption, MegolmDecryption)
        this.supportedAlgorithms = [OLM_ALGORITHM, MEGOLM_ALGORITHM]
        const olmAlgo = ENCRYPTION_CLASSES.get(OLM_ALGORITHM)
        const megolmAlgo = ENCRYPTION_CLASSES.get(MEGOLM_ALGORITHM)
        if (!olmAlgo) {
            throw new Error('olm algorithm not supported for encryption')
        }
        if (!megolmAlgo) {
            throw new Error('megolm algorithm not supported for encryption')
        }
        const alg: EncryptionAlgorithm = new olmAlgo({
            userId: this.userId,
            deviceId: this.deviceId,
            crypto: this,
            olmDevice: this.olmDevice,
            baseApis: this.client,
            config: { algorithm: OLM_ALGORITHM },
        })
        const megolmAlg: EncryptionAlgorithm = new megolmAlgo({
            userId: this.userId,
            deviceId: this.deviceId,
            crypto: this,
            olmDevice: this.olmDevice,
            baseApis: this.client,
            config: { algorithm: OLM_ALGORITHM },
        })
        this.streamEncryptors.set(EncryptedEventStreamTypes.Channel, megolmAlg)
        this.streamEncryptors.set(EncryptedEventStreamTypes.ToDevice, alg)
        this.streamEncryptors.set(EncryptedEventStreamTypes.Uknown, alg)

        // todo:: implement
        // outgoingRoomKeyRequestManager
        // toDeviceVerificationRequests
        // cryptoCallbacks for crypto extensions
        // crossSigningInfo
        // SecretStorage
        // dehydrationManager
    }

    /** stop background processes */
    public stop(): void {
        // todo: outgoingRoomKeyRequestManager.stop, dehydrationManager.stop
        this.deviceList.stop()
    }

    /** Iniitalize crypto module prior to usage
     *
     */
    public async init({ exportedOlmDevice, pickleKey }: IInitOpts = {}): Promise<void> {
        // initialize deviceKey and fallbackKey
        await this.olmDevice.init({ exportedOlmDevice, pickleKey })
        // todo: implement
        //await this.deviceList.load()

        // build device keys to upload
        if (!this.olmDevice.deviceCurve25519Key || !this.olmDevice.deviceDoNotUseKey) {
            log('device keys not initialized, cannot encrypt event')
        }
        this.deviceKeys['donotuse:' + this.deviceId] = this.olmDevice.deviceDoNotUseKey ?? ''
        this.deviceKeys['curve25519:' + this.deviceId] = this.olmDevice.deviceCurve25519Key ?? ''

        // todo: create fallback keys here
        const fallbackKey = this.olmDevice.fallbackKey
        const keyId = Object.keys(fallbackKey)[0]
        this.fallbackKeys[this.deviceId] = {
            [`curve25519:${this.deviceId}:${keyId}`]: { key: fallbackKey[keyId] },
        }

        log('Crypto: fetching own devices...')
        let myDevices = this.deviceList.getRawStoredDevicesForUser(this.userId)

        if (!myDevices) {
            myDevices = {}
        }

        if (!myDevices[this.deviceId]) {
            // add our own deviceinfo to the cryptoStore
            log('Crypto: adding this device to the store...')
            const deviceInfo = {
                keys: this.deviceKeys,
                algorithms: this.supportedAlgorithms,
                verified: DeviceInfo.DeviceVerification.VERIFIED,
                known: true,
            }

            myDevices[this.deviceId] = deviceInfo
            this.deviceList.storeDevicesForUser(this.userId, myDevices)
            // await this.deviceList.saveIfDirty()
        }

        // todo:
        // get cross-signing keys
        // start tracking out own device list
        // start key backup manager
    }

    public async uploadDeviceKeys(): Promise<void> {
        // todo: add signatures for verification to device keys
        const deviceKeys = {
            algorithms: this.supportedAlgorithms,
            device_id: this.deviceId,
            keys: this.deviceKeys,
            user_id: this.userId,
            signatures: {},
        }

        const fallbackKey = this.fallbackKeys[this.deviceId]

        return this.signObject(deviceKeys).then(() => {
            return this.client.uploadKeysRequest({
                user_id: this.userId,
                device_id: this.deviceId,
                device_keys: deviceKeys,
                fallback_keys: fallbackKey,
            })
        })
    }

    public async signObject<T extends ISignableObject & object>(obj: T): Promise<void> {
        const sigs = new Map(Object.entries(obj.signatures || {}))
        const unsigned = obj.unsigned

        delete obj.signatures
        delete obj.unsigned

        const userSignatures = sigs.get(this.userId) || {}
        sigs.set(this.userId, userSignatures)
        // todo: implement olmDevice sign using TDK as signing key
        // https://linear.app/hnt-labs/issue/HNT-1796/tdk-signature-storage-curve25519-key
        userSignatures['donotuse:' + this.deviceId] = ''
        obj.signatures = recursiveMapToObject(sigs)
        if (unsigned !== undefined) {
            obj.unsigned = unsigned
        }
    }

    /**
     * Encrypt an event according to the configuration of the stream.
     *
     * @param event -  event to be sent
     *
     * @param userIds - destination userId devices to encrypt messages for
     * jterzis: 06/14/23: if 1 userId, sync all devices for that user and
     * and encrypt contents for those devices. If multiple userIds, sync
     * each user's devices and encrypt contents for those devices. Assumes
     * the caller checks the membership of those users for a room in the case
     * of group message encryption.
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    public async encryptEvent(event: RiverEvent, target: EncryptionTarget): Promise<void> {
        const streamType = event.getStreamType() ?? EncryptedEventStreamTypes.ToDevice
        const alg = this.streamEncryptors.get(streamType)
        if (!alg) {
            throw new Error(
                'Event for stream type ' +
                    streamType +
                    ' was previously configured to use encryption, but is ' +
                    'no longer.',
            )
        }

        // todo: wait for all the room devices to be loaded
        // await this.trackRoomDevicesImpl(room)
        const content = event.getTypedContent()
        if (!content) {
            throw new Error('Event has no content')
        }
        let encryptionTarget: string[] | string
        if (isUserTarget(target)) {
            encryptionTarget = target.userIds
        } else {
            encryptionTarget = target.channelId
        }
        const encryptedContent = await alg.encryptMessage(
            encryptionTarget,
            event.getType() ?? '',
            content.content,
        )

        if (
            this.olmDevice.deviceCurve25519Key === null ||
            this.olmDevice.deviceDoNotUseKey === null
        ) {
            throw new Error('device keys not initialized, cannot encrypt event')
        }
        event.makeEncrypted(
            RiverEventType.Encrypted,
            encryptedContent,
            this.olmDevice.deviceCurve25519Key,
            this.olmDevice.deviceDoNotUseKey,
        )
    }

    /**
     * Decrypt a received event
     */
    public async decryptEvent(event: RiverEvent): Promise<IEventDecryptionResult> {
        if (event.isRedacted()) {
            // todo: implement
            throw new Error('decryption of redacted events not implemented')
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const content = event.getWireContent().content
            if (!content?.algorithm) {
                throw new Error('Event has no algorithm specified')
            }
            const alg = this.getDecryptor(content.algorithm)
            return alg.decryptEvent(event)
        }
    }

    /**
     * Get a decryptor for a given algorithm.
     *
     * If we already have a decryptor for a given algorithm for this device, return
     * it. Otherwise try to instantiate it.
     *
     */
    public getDecryptor(algorithm: string): DecryptionAlgorithm {
        let alg: DecryptionAlgorithm | undefined
        alg = this.decryptors.get(algorithm)
        if (alg) {
            return alg
        }

        const AlgClass = DECRYPTION_CLASSES.get(algorithm)
        if (!AlgClass) {
            throw new DecryptionError(
                'UNKNOWN_ENCRYPTION_ALGORITHM',
                'Unknown encryption algorithm "' + algorithm + '".',
            )
        }
        alg = new AlgClass({
            userId: this.userId,
            crypto: this,
            olmDevice: this.olmDevice,
            baseApis: this.client,
        })

        if (this.decryptors) {
            this.decryptors.set(algorithm, alg)
        }
        return alg
    }

    /**
     * Get the stored keys for a single device
     *
     *
     * @returns device, or undefined
     * if we don't know about this device
     */
    public getStoredDevice(userId: string, deviceId: string): DeviceInfo | undefined {
        const devices = this.deviceList.getStoredDevice(userId, deviceId)
        if (devices) {
            return devices
        }
        return
    }

    /**
     * Try to make sure we have established olm sessions for all known devices for
     * the given users.
     *
     * @param users - list of user ids
     * @param force - If true, force a new Olm session to be created. Default false.
     *
     * @returns resolves once the sessions are complete, to
     *    an Object mapping from userId to deviceId to
     *    `IOlmSessionResult`
     */
    public ensureOlmSessionsForUsers(
        users: string[],
        force?: boolean,
    ): Promise<Map<string, Map<string, IOlmSessionResult>>> {
        // map user Id → DeviceInfo[]
        const devicesByUser: Map<string, DeviceInfo[]> = new Map()

        for (const userId of users) {
            const userDevices: DeviceInfo[] = []
            devicesByUser.set(userId, userDevices)

            const devices = this.deviceList.getStoredDevicesForUser(userId) || []
            for (const deviceInfo of devices) {
                const key = deviceInfo.getIdentityKey()
                if (key == this.olmDevice.deviceCurve25519Key) {
                    // don't bother setting up session to ourself
                    continue
                }
                /* todo: implement device verification
                    if (deviceInfo.verified == DeviceVerification.BLOCKED) {
                        // don't bother setting up sessions with blocked users
                        continue;
                    }
                    */

                userDevices.push(deviceInfo)
            }
        }

        return ensureOlmSessionsForDevices(this.olmDevice, this.client, devicesByUser, force)
    }

    /**
     * Encrypts and sends a given object via Olm to-device messages to a given set of devices.
     *
     */
    public async encryptAndSendToDevices(
        userDeviceInfoArr: IOlmDevice[],
        payload: object,
        type: ToDeviceOp = ToDeviceOp.TDO_UNSPECIFIED,
    ): Promise<void> {
        const toDeviceBatch: ToDeviceBatch = {
            batch: [],
        }

        // todo: standardize this payload envelope across all callers of encryptMessageForDevice
        const payloadFields = { type: type, content: payload }

        try {
            // encrypt payload with Olm for each device individually
            await Promise.all(
                userDeviceInfoArr.map(async ({ userId, deviceInfo }) => {
                    const deviceId = deviceInfo.deviceId
                    const encryptedContent: IOlmEncryptedContent = {
                        algorithm: OLM_ALGORITHM,
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        sender_key: this.olmDevice.deviceCurve25519Key!,
                        ciphertext: {} as PlainMessage<EncryptedDeviceData>['ciphertext'],
                    }

                    toDeviceBatch.batch.push({
                        userId,
                        deviceId,
                        payload: encryptedContent,
                    })

                    // todo: fix this and tighten argument type for client
                    await ensureOlmSessionsForDevices(
                        this.olmDevice,
                        this.client,
                        new Map([[userId, [deviceInfo]]]),
                    )

                    await encryptMessageForDevice(
                        encryptedContent.ciphertext,
                        this.userId,
                        this.deviceId,
                        this.olmDevice,
                        userId,
                        deviceInfo,
                        payloadFields,
                    )
                }),
            )
            // prune any devices that encryptMessageForDevice couldn't encrypt for,
            // which is to say nothing would have been added to the ciphertext object.
            // Corrollary, is that we don't waste a to-device message on a device that
            // we couldn't encrypt for.
            toDeviceBatch.batch = toDeviceBatch.batch.filter((msg) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (Object.keys(msg?.payload?.ciphertext as object).length > 0) {
                    return true
                } else {
                    log(
                        `encryptAndSendToDevices: no ciphertext for device ${msg.userId}, ${msg.deviceId}`,
                    )
                    return false
                }
            })

            try {
                await Promise.all(
                    toDeviceBatch.batch.map(async (msg) => {
                        await this.client.sendToDevicesMessage(
                            msg.userId,
                            {
                                algorithm: OLM_ALGORITHM,
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                ciphertext: msg?.payload?.ciphertext,
                            } as PlainMessage<UserPayload_ToDevice>['message'],
                            type,
                            false,
                        )
                    }),
                )
            } catch (e) {
                log('sendToDeviceFailed', e)
                throw e
            }
        } catch (e) {
            log('sendToDeviceFailed promises failed', e)
            throw e
        }
    }

    /**
     * Import a list of room keys previously exported by exportRoomKeys
     *
     * @param keys - a list of session export objects
     * @returns a promise which resolves once the keys have been imported
     */
    public async importRoomKeys(
        keys: MegolmSession[],
        opts: IImportRoomKeysOpts = {},
    ): Promise<void> {
        let successes = 0
        let failures = 0
        const total = keys.length

        function updateProgress(): void {
            opts.progressCallback?.({
                stage: 'load_keys',
                successes,
                failures,
                total,
            })
        }

        await Promise.all(
            keys.map(async (key) => {
                if (!key.channelId || !key.algorithm) {
                    dlog('ignoring room key entry with missing fields')
                    failures++
                    if (opts.progressCallback) {
                        updateProgress()
                    }
                    return null
                }

                const alg = this.getDecryptor(key.algorithm)
                try {
                    await alg.importRoomKey(key, opts)
                } catch {
                    dlog(`failed to import key`)
                }
                successes++
                if (opts.progressCallback) {
                    updateProgress()
                }
                return
            }),
        )
    }
}

/**
 * Outgoing room key request manager
 */
export enum RoomKeyRequestState {
    /** The request has not been sent */
    Unsent,
    /** The request is sent, awaiting reply */
    Sent,
    /** reply received, cancellation not yet sent */
    CancellationPending,
    /**
     * Cancellation not yet and and will transition to UNSENT
     * instead of being deleted once the cancellation has been sent.
     */
    CancellationPendingAndWillResend,
}
