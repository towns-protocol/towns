import { dlog } from '../dlog'
import { assertBytes } from 'ethereum-cryptography/utils'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { recoverPublicKey, signSync, verify } from 'ethereum-cryptography/secp256k1'
import { check } from '../check'
import { Client } from '../client'
import { OLM_ALGORITHM, MEGOLM_ALGORITHM, UserDevice, MegolmSession } from './olmLib'
import { OlmMegolmDelegate } from '@river/mecholm'
import { OlmDevice } from './olmDevice'
import { EncryptedData, Err } from '@river/proto'
import { bin_fromHexString } from '../binary'
import { ethers } from 'ethers'
import { CryptoStore } from './store/cryptoStore'

import { MegolmDecryption, MegolmEncryption } from './algorithms/megolm'

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

export class Crypto {
    private olmDelegate: OlmMegolmDelegate | undefined

    public readonly supportedAlgorithms: string[]
    public readonly olmDevice: OlmDevice
    public readonly megolmEncryption: MegolmEncryption
    public readonly megolmDecryption: MegolmDecryption

    public globalBlacklistUnverifiedDevices = false
    public globalErrorOnUnknownDevices = true

    public constructor(
        public readonly client: Client,
        public readonly userId: string,
        public readonly deviceId: string,
        public readonly cryptoStore: CryptoStore,
    ) {
        // initialize Olm library
        this.olmDelegate = new OlmMegolmDelegate()
        // olm lib returns a Promise<void> on init, hence the catch if it rejects
        this.olmDelegate.init().catch((e) => {
            log('error initializing olm', e)
            throw e
        })
        this.olmDevice = new OlmDevice(this.olmDelegate, cryptoStore)
        this.supportedAlgorithms = [OLM_ALGORITHM, MEGOLM_ALGORITHM]

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
    }

    /** Iniitalize crypto module prior to usage
     *
     */
    public async init(): Promise<void> {
        // initialize deviceKey and fallbackKey
        await this.olmDevice.init()

        // build device keys to upload
        if (!this.olmDevice.deviceCurve25519Key || !this.olmDevice.deviceDoNotUseKey) {
            log('device keys not initialized, cannot encrypt event')
        }
    }

    /**
     * Encrypt an event using Olm
     *
     * @param payload -  string to be encrypted with Olm
     * @param deviceKeys - recipients to encrypt message for
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    async encryptOlm(payload: string, deviceKeys: UserDevice[]): Promise<Record<string, string>> {
        const ciphertextRecord: Record<string, string> = {}
        await Promise.all(
            deviceKeys.map(async (deviceKey) => {
                const encrypted = await this.olmDevice.encryptUsingFallbackKey(
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
     * Decrypt a received event using Olm
     *
     * @returns a promise which resolves once we have finished decrypting.
     * Rejects with an error if there is a problem decrypting the event.
     */
    public async decryptOlmEvent(ciphertext: string, senderDeviceKey: string): Promise<string> {
        return await this.olmDevice.decryptMessage(ciphertext, senderDeviceKey)
    }

    /**
     * Encrypt an event using Megolm
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    public async encryptMegolmEvent(streamId: string, payload: string): Promise<EncryptedData> {
        return this.megolmEncryption.encryptMessage(streamId, payload)
    }
    /**
     * Decrypt a received event using Megolm
     *
     * @returns a promise which resolves once we have finished decrypting.
     * Rejects with an error if there is a problem decrypting the event.
     */
    public async decryptMegolmEvent(streamId: string, content: EncryptedData) {
        return this.megolmDecryption.decryptEvent(streamId, content)
    }

    /**
     * Import a list of Megolm room keys previously exported by exportRoomKeys
     *
     * @param streamId - the id of the stream the keys are for
     * @param keys - a list of session export objects
     * @returns a promise which resolves once the keys have been imported
     */
    public async importRoomKeys(streamId: string, keys: MegolmSession[]): Promise<void> {
        await this.cryptoStore.withMegolmSessions(async () =>
            Promise.all(
                keys.map(async (key) => {
                    try {
                        await this.megolmDecryption.importRoomKey(streamId, key)
                    } catch {
                        dlog(`failed to import key`)
                    }
                }),
            ),
        )
    }
}
