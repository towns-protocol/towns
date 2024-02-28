import { EncryptedData, Err } from '@river/proto'
import {
    GROUP_ENCRYPTION_ALGORITHM,
    GroupEncryptionSession,
    OLM_ALGORITHM,
    UserDevice,
} from './olmLib'
import { recoverPublicKey, signSync, verify } from 'ethereum-cryptography/secp256k1'

import { CryptoStore } from './cryptoStore'
import { IGroupEncryptionClient } from './base'
import { GroupDecryption } from './groupDecryption'
import { GroupEncryption } from './groupEncryption'
import { EncryptionDevice } from './encryptionDevice'
import { EncryptionDelegate } from './encryptionDelegate'
import { assertBytes } from 'ethereum-cryptography/utils'
import { bin_fromHexString, check, dlog } from '@river/dlog'
import { ethers } from 'ethers'
import { keccak256 } from 'ethereum-cryptography/keccak'

const log = dlog('csb:encryption:groupEncryptionCrypto')

// Create hash header as Uint8Array from string 'CSBLANCA'
const HASH_HEADER = new Uint8Array([67, 83, 66, 76, 65, 78, 67, 65])
// Create hash separator as Uint8Array from string 'ABCDEFG>'
const HASH_SEPARATOR = new Uint8Array([65, 66, 67, 68, 69, 70, 71, 62])
// Create hash footer as Uint8Array from string '<GFEDCBA'
const HASH_FOOTER = new Uint8Array([60, 71, 70, 69, 68, 67, 66, 65])

function numberToUint8Array64LE(num: number): Uint8Array {
    const result = new Uint8Array(8)
    for (let i = 0; num != 0; i++, num = num >>> 8) {
        result[i] = num & 0xff
    }
    return result
}

function pushByteToUint8Array(arr: Uint8Array, byte: number): Uint8Array {
    const ret = new Uint8Array(arr.length + 1)
    ret.set(arr)
    ret[arr.length] = byte
    return ret
}

export function checkSignature(signature: Uint8Array) {
    assertBytes(signature, 65)
}

export function checkHash(hash: Uint8Array) {
    assertBytes(hash, 32)
}

export function townsHash(data: Uint8Array): Uint8Array {
    assertBytes(data)
    const hasher = keccak256.create()
    hasher.update(HASH_HEADER)
    hasher.update(numberToUint8Array64LE(data.length))
    hasher.update(HASH_SEPARATOR)
    hasher.update(data)
    hasher.update(HASH_FOOTER)
    return hasher.digest()
}

export async function townsSign(
    hash: Uint8Array,
    privateKey: Uint8Array | string,
): Promise<Uint8Array> {
    checkHash(hash)
    // TODO(HNT-1380): why async sign doesn't work in node? Use async sign in the browser, sync sign in node?
    const [sig, recovery] = signSync(hash, privateKey, { recovered: true, der: false })
    return pushByteToUint8Array(sig, recovery)
}

export function townsVerifySignature(
    hash: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array | string,
): boolean {
    checkHash(hash)
    checkSignature(signature)
    return verify(signature.slice(0, 64), hash, publicKey)
}

export function townsRecoverPubKey(hash: Uint8Array, signature: Uint8Array): Uint8Array {
    checkHash(hash)
    checkSignature(signature)
    return recoverPublicKey(hash, signature.slice(0, 64), signature[64])
}

export function publicKeyToAddress(publicKey: Uint8Array): Uint8Array {
    assertBytes(publicKey, 64, 65)
    if (publicKey.length === 65) {
        publicKey = publicKey.slice(1)
    }
    return keccak256(publicKey).slice(-20)
}

export function publicKeyToUint8Array(publicKey: string): Uint8Array {
    // Uncompressed public key in string form should start with '0x04'.
    check(
        typeof publicKey === 'string' && publicKey.startsWith('0x04') && publicKey.length === 132,
        'Bad public key',
        Err.BAD_PUBLIC_KEY,
    )
    return bin_fromHexString(publicKey)
}

export async function makeTownsDelegateSig(
    userPrivateKey: () => Uint8Array | string,
    devicePubKey: Uint8Array,
): Promise<Uint8Array> {
    const hash = townsHash(devicePubKey)
    check(devicePubKey.length === 65, 'Bad public key', Err.BAD_PUBLIC_KEY)
    return townsSign(hash, userPrivateKey())
}

// TODO(HNT-1380): once we switch to the new signing model, remove this function
export async function makeOldTownsDelegateSig(
    primaryWallet: ethers.Signer,
    devicePubKey: Uint8Array | string,
): Promise<Uint8Array> {
    if (typeof devicePubKey === 'string') {
        devicePubKey = publicKeyToUint8Array(devicePubKey)
    }
    check(devicePubKey.length === 65, 'Bad public key', Err.BAD_PUBLIC_KEY)
    return bin_fromHexString(await primaryWallet.signMessage(devicePubKey))
}

export class GroupEncryptionCrypto {
    private delegate: EncryptionDelegate | undefined

    public readonly supportedAlgorithms: string[]
    public readonly encryptionDevice: EncryptionDevice
    public readonly groupEncryption: GroupEncryption
    public readonly groupDecryption: GroupDecryption
    public readonly cryptoStore: CryptoStore
    public globalBlacklistUnverifiedDevices = false
    public globalErrorOnUnknownDevices = true

    public constructor(client: IGroupEncryptionClient, cryptoStore: CryptoStore) {
        this.cryptoStore = cryptoStore
        // initialize Olm library
        this.delegate = new EncryptionDelegate()
        // olm lib returns a Promise<void> on init, hence the catch if it rejects
        this.delegate.init().catch((e) => {
            log('error initializing olm', e)
            throw e
        })
        this.encryptionDevice = new EncryptionDevice(this.delegate, cryptoStore)
        this.supportedAlgorithms = [OLM_ALGORITHM, GROUP_ENCRYPTION_ALGORITHM]

        this.groupEncryption = new GroupEncryption({
            device: this.encryptionDevice,
            client,
        })
        this.groupDecryption = new GroupDecryption({
            device: this.encryptionDevice,
        })
    }

    /** Iniitalize crypto module prior to usage
     *
     */
    public async init(): Promise<void> {
        // initialize deviceKey and fallbackKey
        await this.encryptionDevice.init()

        // build device keys to upload
        if (
            !this.encryptionDevice.deviceCurve25519Key ||
            !this.encryptionDevice.deviceDoNotUseKey
        ) {
            log('device keys not initialized, cannot encrypt event')
        }
    }

    /**
     * Encrypt an event using the device keys
     *
     * @param payload -  string to be encrypted
     * @param deviceKeys - recipients to encrypt message for
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    public async encryptWithDeviceKeys(
        payload: string,
        deviceKeys: UserDevice[],
    ): Promise<Record<string, string>> {
        const ciphertextRecord: Record<string, string> = {}
        await Promise.all(
            deviceKeys.map(async (deviceKey) => {
                const encrypted = await this.encryptionDevice.encryptUsingFallbackKey(
                    deviceKey.deviceKey,
                    deviceKey.fallbackKey,
                    payload,
                )
                check(encrypted.type === 0, 'expecting only prekey messages at this time')
                ciphertextRecord[deviceKey.deviceKey] = encrypted.body
            }),
        )
        return ciphertextRecord
    }

    /**
     * Decrypt a received event using the device key
     *
     * @returns a promise which resolves once we have finished decrypting.
     * Rejects with an error if there is a problem decrypting the event.
     */
    public async decryptWithDeviceKey(
        ciphertext: string,
        senderDeviceKey: string,
    ): Promise<string> {
        return await this.encryptionDevice.decryptMessage(ciphertext, senderDeviceKey)
    }

    /**
     * Encrypt an event using group encryption algorithm
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    public async encryptGroupEvent(streamId: string, payload: string): Promise<EncryptedData> {
        return this.groupEncryption.encrypt(streamId, payload)
    }
    /**
     * Decrypt a received event using group encryption algorithm
     *
     * @returns a promise which resolves once we have finished decrypting.
     * Rejects with an error if there is a problem decrypting the event.
     */
    public async decryptGroupEvent(streamId: string, content: EncryptedData) {
        return this.groupDecryption.decrypt(streamId, content)
    }

    /**
     * Import a list of group session keys previously exported by exportRoomKeys
     *
     * @param streamId - the id of the stream the keys are for
     * @param keys - a list of session export objects
     * @returns a promise which resolves once the keys have been imported
     */
    public async importSessionKeys(
        streamId: string,
        keys: GroupEncryptionSession[],
    ): Promise<void> {
        await this.cryptoStore.withGroupSessions(async () =>
            Promise.all(
                keys.map(async (key) => {
                    try {
                        await this.groupDecryption.importStreamKey(streamId, key)
                    } catch {
                        log(`failed to import key`)
                    }
                }),
            ),
        )
    }
}
