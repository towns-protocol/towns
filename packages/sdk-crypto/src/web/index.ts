import { throwWithCode } from '@towns-protocol/utils'
import { EncryptedData, Err } from '@towns-protocol/proto'
import { AES_GCM_DERIVED_ALGORITHM } from '@towns-protocol/encryption'

export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    const binary = Array.from(uint8Array, (byte) => String.fromCharCode(byte)).join('')
    return btoa(binary)
}

export function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64)
    return new Uint8Array(Array.from(binary, (char) => char.charCodeAt(0)))
}

async function getExtendedKeyMaterial(seedBuffer: Uint8Array, length: number): Promise<Uint8Array> {
    let keyMaterial = new Uint8Array(await crypto.subtle.digest('SHA-256', seedBuffer))

    while (keyMaterial.length < length) {
        const newHash = new Uint8Array(await crypto.subtle.digest('SHA-256', keyMaterial))
        const combined = new Uint8Array(keyMaterial.length + newHash.length)
        combined.set(keyMaterial)
        combined.set(newHash, keyMaterial.length)
        keyMaterial = combined
    }

    return keyMaterial.slice(0, length)
}

export async function deriveKeyAndIV(
    keyPhrase: string | Uint8Array,
): Promise<{ key: Uint8Array; iv: Uint8Array }> {
    let keyBuffer: Uint8Array

    if (typeof keyPhrase === 'string') {
        const encoder = new TextEncoder()
        keyBuffer = encoder.encode(keyPhrase)
    } else {
        keyBuffer = keyPhrase
    }

    const keyMaterial = await getExtendedKeyMaterial(keyBuffer, 32 + 12) // 32 bytes for key, 12 bytes for IV

    const key = keyMaterial.slice(0, 32) // AES-256 key
    const iv = keyMaterial.slice(32, 32 + 12) // AES-GCM IV

    return { key, iv }
}

export async function encryptAESGCM(
    data: Uint8Array,
    key?: Uint8Array,
    iv?: Uint8Array,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array; secretKey: Uint8Array }> {
    if (!data || data.length === 0) {
        throw new Error('Cannot encrypt undefined or empty data')
    }

    if (!key) {
        key = new Uint8Array(32)
        crypto.getRandomValues(key)
    } else if (key.length !== 32) {
        throw new Error('Invalid key length. AES-256-GCM requires a 32-byte key.')
    }

    if (!iv) {
        iv = new Uint8Array(12)
        crypto.getRandomValues(iv)
    } else if (iv.length !== 12) {
        throw new Error('Invalid IV length. AES-256-GCM requires a 12-byte IV.')
    }

    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, [
        'encrypt',
    ])

    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        cryptoKey,
        data,
    )

    const ciphertext = new Uint8Array(encryptedBuffer)

    return { ciphertext, iv, secretKey: key }
}

export async function decryptAESGCM(
    data: Uint8Array | string,
    key: Uint8Array,
    iv: Uint8Array,
): Promise<Uint8Array> {
    if (key.length !== 32) {
        throw new Error('Invalid key length. AES-256-GCM requires a 32-byte key.')
    }

    if (iv.length !== 12) {
        throw new Error('Invalid IV length. AES-256-GCM requires a 12-byte IV.')
    }

    let dataBuffer: Uint8Array
    if (typeof data === 'string') {
        dataBuffer = base64ToUint8Array(data)
    } else {
        dataBuffer = data
    }

    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, [
        'decrypt',
    ])

    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        cryptoKey,
        dataBuffer,
    )

    return new Uint8Array(decryptedBuffer)
}

export async function decryptDerivedAESGCM(
    keyPhrase: string,
    encryptedData: EncryptedData,
): Promise<Uint8Array> {
    if (encryptedData.algorithm !== AES_GCM_DERIVED_ALGORITHM) {
        throwWithCode(`${encryptedData.algorithm}" algorithm not implemented`, Err.UNIMPLEMENTED)
    }
    const { key, iv } = await deriveKeyAndIV(keyPhrase)
    const ciphertext = base64ToUint8Array(encryptedData.ciphertext)
    return decryptAESGCM(ciphertext, key, iv)
}
