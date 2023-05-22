// TODO(HNT-1380): looks like browser supports async sign, but nodejs doesn't by default
// Figure out if async sign should be used everywhere.
// import { webcrypto } from 'node:crypto'
// // @ts-ignore
// if (!globalThis.crypto) globalThis.crypto = webcrypto // @ts-ignore

import { assertBytes } from 'ethereum-cryptography/utils'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { recoverPublicKey, signSync, verify } from 'ethereum-cryptography/secp256k1'
import { check } from './check'
import { Client } from './client'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { OlmMegolmDelegate } from '@towns/mecholm'
import { Err } from '@towns/proto'
import { bin_fromHexString, IDeviceKeys, ISignatures, recursiveMapToObject } from './types'
import { ethers } from 'ethers'

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

export interface IDevice {
    keys: Record<string, string>
    algorithms: string[]
    verified: DeviceVerification
    known: boolean
    unsigned?: Record<string, any>
    signatures?: ISignatures
}

enum DeviceVerification {
    Blocked = -1,
    Unverified = 0,
    Verified = 1,
}

export class DeviceInfo {
    public static fromStorage(obj: Partial<IDevice>, deviceId: string): DeviceInfo {
        const res = new DeviceInfo(deviceId)
        for (const prop in obj) {
            // eslint-disable-next-line
            if (obj.hasOwnProperty(prop)) {
                // @ts-ignore
                res[prop as keyof IDevice] = obj[prop as keyof IDevice]
            }
        }
        return res
    }

    public static DeviceVerification = {
        VERIFIED: DeviceVerification.Verified,
        UNVERIFIED: DeviceVerification.Unverified,
        BLOCKED: DeviceVerification.Blocked,
    }

    /** list of algorithms supported by this device */
    public algorithms: string[] = []
    /** a map from `<key type>:<id> -> <base64-encoded key>` */
    public keys: Record<string, string> = {}
    /** whether the device has been verified/blocked by the user */
    public verified = DeviceVerification.Unverified
    /**
     * whether the user knows of this device's existence
     * (useful when warning the user that a user has added new devices)
     */
    public known = false
    public unsigned: Record<string, string> = {}
    public signatures: ISignatures = {}

    public constructor(public readonly deviceId: string) {}

    public toStorage(): IDevice {
        return {
            algorithms: this.algorithms,
            keys: this.keys,
            verified: this.verified,
            known: this.known,
            unsigned: this.unsigned,
            signatures: this.signatures,
        }
    }

    /**
     * Get the fingerprint for this device (i.e. Ed25519 key)
     *
     * returns base64-encoded fingerprint of this device
     */
    public getFingerprint(): string {
        return this.keys['ed25519:' + this.deviceId]
    }

    /**
     * Get the identity key for this device (i.e. Curve25519 key)
     *
     * returns base64-encoded identity key of this device
     */
    public getIdentityKey(): string {
        return this.keys['curve25519:' + this.deviceId]
    }

    public getDisplayName(): string | undefined {
        return this.unsigned.device_display_name || undefined
    }

    public isBlocked(): boolean {
        return this.verified == DeviceVerification.Blocked
    }

    public isVerified(): boolean {
        return this.verified == DeviceVerification.Verified
    }

    public isUnverified(): boolean {
        return this.verified == DeviceVerification.Unverified
    }

    public isKnown(): boolean {
        return this.known === true
    }
}

// jterzis: what events do we need for olm-megolm ?
export enum CryptoEvent {
    DeviceVerificationChanged = 'deviceVerificationChanged',
    WillUpdateDevices = 'crypto.willUpdateDevices',
    DevicesUpdated = 'crypto.devicesUpdated',
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
}

interface ISignableObject {
    signatures?: ISignatures
    unsigned?: object
}

export class Crypto
    extends (EventEmitter as new () => TypedEmitter<CryptoEventHandlerMap>)
    implements CryptoBackend
{
    private deviceKeys: Record<string, string> = {}
    private olmDelegate: OlmMegolmDelegate | undefined

    public readonly supportedAlgorithms: string[]

    public constructor(
        public readonly client: Client,
        public readonly userId: string,
        public readonly deviceId: string,
    ) {
        super()
        // jterzis 05/05/23: this list is probably close to the actual list, but also tentative until confirmed.
        this.supportedAlgorithms = ['m.olm.v1.curve25519-aes-sha2', 'm.megolm.v1.aes-sha2']
    }

    /** Iniitalize crypto module prior to usage
     *
     */
    public async init(): Promise<void> {
        // initialize Olm library
        this.olmDelegate = new OlmMegolmDelegate()
        await this.olmDelegate.init()
        // TODO: initialize Olm device

        // build device keys to upload
        // TODO: implement olmDevice and init
        this.deviceKeys['ed25519:' + this.deviceId] = ''
        this.deviceKeys['curve25519:' + this.deviceId] = ''
    }

    public async uploadDeviceKeys(): Promise<void> {
        const deviceKeys = {
            algorithms: this.supportedAlgorithms,
            device_id: this.deviceId,
            keys: this.deviceKeys,
            user_id: this.userId,
        }

        return this.signObject(deviceKeys).then(() => {
            return this.client.uploadKeysRequest({
                user_id: this.userId,
                device_id: this.deviceId,
                device_keys: deviceKeys as unknown as Required<IDeviceKeys>,
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
        // todo: implement olmDevice sign
        userSignatures['ed25519:' + this.deviceId] = ''
        obj.signatures = recursiveMapToObject(sigs)
        if (unsigned !== undefined) {
            obj.unsigned = unsigned
        }
    }
}
