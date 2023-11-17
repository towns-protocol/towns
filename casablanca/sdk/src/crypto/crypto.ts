// TODO(HNT-1380): looks like browser supports async sign, but nodejs doesn't by default
// Figure out if async sign should be used everywhere.

import { dlog } from '../dlog'
import { assertBytes } from 'ethereum-cryptography/utils'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { recoverPublicKey, signSync, verify } from 'ethereum-cryptography/secp256k1'
import { check } from '../check'
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
    ChannelMessage,
    EncryptedData,
    EncryptedDeviceData,
    EncryptedMessageEnvelope,
    Err,
    MegolmSession,
    OlmMessage,
    ToDeviceMessage,
    ToDeviceOp,
    UserPayload_ToDevice,
} from '@river/proto'
import { IFallbackKey, recursiveMapToObject } from '../types'
import { bin_fromHexString } from '../binary'
import { DeviceList, IOlmDevice } from './deviceList'
import { ethers } from 'ethers'
import { CryptoStore } from './store/cryptoStore'
import { OlmDecryption, OlmEncryption } from './algorithms/olm'
import { MegolmDecryption, MegolmEncryption } from './algorithms/megolm'
import { ClearContent, RiverEventV2 } from '../eventV2'

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
    clearEvent: ClearContent
    /**
     * Key owned by the sender of this event.
     */
    senderCurve25519Key?: string
    /**
     * The sender doesn't authorize the unverified devices to decrypt his messages
     */
    encryptedDisabledForUnverifiedDevices?: boolean
}

export interface IEventOlmDecryptionResult {
    /**
     * The plaintext payload for the event (typically containing <tt>type</tt> and <tt>content</tt> fields).
     */
    clearEvent: OlmMessage
    /**
     * Key owned by the sender of this event.
     */
    senderCurve25519Key?: string
}

export interface IEncryptionUserRecipient {
    userIds: string[]
}

export interface IEncryptionStreamRecipient {
    streamId: string
}

export type GroupEncryptionInput = {
    content: ChannelMessage
    recipient: IEncryptionStreamRecipient
}

export type EncryptionInput = {
    content: ToDeviceMessage
    recipient: IEncryptionUserRecipient
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
    stream_id: string
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
     * Encrypt an event using Olm
     *
     * @param event -  event to be encrypted with Olm
     * @param recipients - recipients to encrypt message for
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    encryptOlmEvent(
        event: ToDeviceMessage,
        recipients: IEncryptionUserRecipient,
    ): Promise<EncryptedDeviceData>

    /**
     * Encrypt an event using Megolm
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    encryptMegolmEvent(input: GroupEncryptionInput): Promise<EncryptedData>

    /**
     * Decrypt a received event using Megolm
     *
     * @returns a promise which resolves once we have finished decrypting.
     * Rejects with an error if there is a problem decrypting the event.
     */
    decryptMegolmEvent(event: RiverEventV2): Promise<ClearContent>

    /**
     * Decrypt a received event using Olm
     *
     * @returns a promise which resolves once we have finished decrypting.
     * Rejects with an error if there is a problem decrypting the event.
     */
    decryptOlmEvent(
        event: UserPayload_ToDevice,
        senderUserId: string,
    ): Promise<IEventOlmDecryptionResult>
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

    public readonly olmEncryption: OlmEncryption
    public readonly megolmEncryption: MegolmEncryption
    public readonly olmDecryption: OlmDecryption
    public readonly megolmDecryption: MegolmDecryption

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
        this.olmDevice = new OlmDevice(this.olmDelegate, cryptoStore)
        this.deviceList = new DeviceList(this.client, cryptoStore, this.olmDevice)
        this.supportedAlgorithms = [OLM_ALGORITHM, MEGOLM_ALGORITHM]
        this.olmEncryption = new OlmEncryption({
            userId: this.userId,
            deviceId: this.deviceId,
            crypto: this,
            olmDevice: this.olmDevice,
            baseApis: this.client,
            config: { algorithm: OLM_ALGORITHM },
        })
        this.olmDecryption = new OlmDecryption({
            userId: this.userId,
            crypto: this,
            olmDevice: this.olmDevice,
            baseApis: this.client,
        })
        this.megolmEncryption = new MegolmEncryption({
            userId: this.userId,
            deviceId: this.deviceId,
            crypto: this,
            olmDevice: this.olmDevice,
            baseApis: this.client,
            config: { algorithm: OLM_ALGORITHM },
        })
        this.megolmDecryption = new MegolmDecryption({
            userId: this.userId,
            crypto: this,
            olmDevice: this.olmDevice,
            baseApis: this.client,
        })

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
     * Encrypt an event using Olm.
     *
     * @param event -  event to be sent
     *
     * @param target - destination userId devices to encrypt messages for
     * jterzis: 06/14/23: if 1 userId, sync all devices for that user and
     * and encrypt contents for those devices. If multiple userIds, sync
     * each user's devices and encrypt contents for those devices. Assumes
     * the caller checks the membership of those users for a room in the case
     * of group message encryption.
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    public async encryptOlmEvent(
        event: ToDeviceMessage,
        recipient: IEncryptionUserRecipient,
    ): Promise<EncryptedDeviceData> {
        const encryptedContent = await this.olmEncryption.encryptMessage(recipient.userIds, event)

        if (
            this.olmDevice.deviceCurve25519Key === null ||
            this.olmDevice.deviceDoNotUseKey === null
        ) {
            throw new Error('device keys not initialized, cannot encrypt event')
        }
        const encryptedDeviceData = new EncryptedDeviceData({
            ciphertext: encryptedContent.ciphertext,
            algorithm: encryptedContent.algorithm,
        })
        return encryptedDeviceData
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
    public async encryptMegolmEvent(input: GroupEncryptionInput): Promise<EncryptedData> {
        const alg = this.megolmEncryption
        const content = input.content
        if (!content) {
            throw new Error('Event has no content')
        }

        if (this.olmDevice.deviceCurve25519Key === null) {
            throw new Error('device keys not initialized, cannot encrypt event')
        }

        const encrypted = await alg.encryptMessage(input.recipient.streamId, content)

        const encryptedData = new EncryptedData({
            text: encrypted.ciphertext,
            algorithm: encrypted.algorithm,
            senderKey: encrypted.sender_key,
            deviceId: encrypted.device_id,
            sessionId: encrypted.session_id,
        })

        return encryptedData
    }

    /**
     * Decrypt a received event using Olm
     */
    public async decryptOlmEvent(
        event: UserPayload_ToDevice,
        senderUserId: string,
    ): Promise<IEventOlmDecryptionResult> {
        if (!event?.message?.algorithm) {
            throw new Error('Event has no algorithm specified')
        }
        return this.olmDecryption.decryptEvent(event, senderUserId)
    }

    /**
     * Decrypt a received event using Megolm
     */
    public async decryptMegolmEvent(event: RiverEventV2): Promise<ClearContent> {
        return this.megolmDecryption.decryptEvent(event)
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
        payload: ToDeviceMessage,
    ): Promise<void> {
        const toDeviceBatch: ToDeviceBatch = {
            batch: [],
        }

        try {
            // encrypt payload with Olm for each device individually
            await Promise.all(
                userDeviceInfoArr.map(async ({ userId, deviceInfo }) => {
                    const deviceId = deviceInfo.deviceId
                    const ciphertextRecord: Record<string, EncryptedMessageEnvelope> = {}
                    const encryptedContent: IOlmEncryptedContent = {
                        algorithm: OLM_ALGORITHM,
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        sender_key: this.olmDevice.deviceCurve25519Key!,
                        ciphertext: ciphertextRecord,
                    }

                    toDeviceBatch.batch.push({
                        userId,
                        deviceId,
                        payload: encryptedContent,
                    })

                    // ensure Olm session for devices, forcing a new one
                    // which means every message is a pre-key message
                    // using the fallback key.
                    await ensureOlmSessionsForDevices(
                        this.olmDevice,
                        this.client,
                        new Map([[userId, [deviceInfo]]]),
                        true,
                    )

                    const payloadFields = new OlmMessage({ content: payload })
                    await encryptMessageForDevice(
                        encryptedContent.ciphertext,
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
                if (!msg.payload?.ciphertext) {
                    log(
                        `encryptAndSendToDevices: no ciphertext for device ${msg.userId}, ${msg.deviceId}`,
                    )
                    return false
                }
                if (Object.keys(msg.payload.ciphertext).length > 0) {
                    return true
                } else {
                    log(
                        `encryptAndSendToDevices: no ciphertext for device ${msg.userId}, ${msg.deviceId}`,
                    )
                    return false
                }
            })

            try {
                let type: ToDeviceOp
                switch (payload.payload.case) {
                    case 'request':
                        type = ToDeviceOp.TDO_KEY_REQUEST
                        break
                    case 'response':
                        type = ToDeviceOp.TDO_KEY_RESPONSE
                        break
                    default:
                        throw new Error('Unknown payload type')
                }
                await Promise.all(
                    toDeviceBatch.batch.map(async (msg) => {
                        if (!msg.payload?.ciphertext) {
                            log(
                                `encryptAndSendToDevices: no ciphertext for device ${msg.userId}, ${msg.deviceId}`,
                            )
                            throw new Error('no ciphertext')
                        }
                        await this.client.sendToDevicesMessage(
                            msg.userId,
                            new EncryptedDeviceData({
                                algorithm: OLM_ALGORITHM,
                                ciphertext: msg.payload.ciphertext,
                            }),
                            type,
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
     * Import a list of Megolm room keys previously exported by exportRoomKeys
     *
     * @param keys - a list of session export objects
     * @returns a promise which resolves once the keys have been imported
     */
    public async importRoomKeys(
        streamId: string,
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
                if (!streamId || !key.algorithm) {
                    dlog('ignoring room key entry with missing fields')
                    failures++
                    if (opts.progressCallback) {
                        updateProgress()
                    }
                    return null
                }

                const alg = this.megolmDecryption
                try {
                    await alg.importRoomKey(streamId, key)
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
