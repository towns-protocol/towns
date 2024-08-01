// This function is a helper for encrypting and decrypting public content.
// The same IV and key are generated from the key phrase each time.
// Not intended for protecting sensitive data, but rather for obfuscating content.

import { throwWithCode } from '@river-build/dlog'
import { EncryptedData, Err } from '@river-build/proto'
import { AES_GCM_DERIVED_ALGORITHM } from '@river-build/encryption'
import crypto from 'crypto'

export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    return Buffer.from(uint8Array).toString('base64')
}

export function base64ToUint8Array(base64: string): Uint8Array {
    const buffer = Buffer.from(base64, 'base64')
    return new Uint8Array(buffer)
}

function bufferToUint8Array(buffer: Buffer): Uint8Array {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

function uint8ArrayToBuffer(uint8Array: Uint8Array): Buffer {
    return Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength)
}

async function getExtendedKeyMaterial(seedBuffer: Uint8Array, length: number): Promise<Uint8Array> {
    const hash = crypto.createHash('sha256')
    hash.update(uint8ArrayToBuffer(seedBuffer))
    let keyMaterial = bufferToUint8Array(hash.digest())

    while (keyMaterial.length < length) {
        const newHash = crypto.createHash('sha256')
        newHash.update(uint8ArrayToBuffer(keyMaterial))
        keyMaterial = new Uint8Array([...keyMaterial, ...bufferToUint8Array(newHash.digest())])
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
        key = crypto.randomBytes(32)
    } else if (key.length !== 32) {
        throw new Error('Invalid key length. AES-256-GCM requires a 32-byte key.')
    }

    if (!iv) {
        iv = crypto.randomBytes(12)
    } else if (iv.length !== 12) {
        throw new Error('Invalid IV length. AES-256-GCM requires a 12-byte IV.')
    }

    const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        uint8ArrayToBuffer(key),
        uint8ArrayToBuffer(iv),
    )
    const encrypted = Buffer.concat([cipher.update(uint8ArrayToBuffer(data)), cipher.final()])
    const authTag = cipher.getAuthTag()
    const ciphertext = Buffer.concat([encrypted, authTag])

    return { ciphertext: bufferToUint8Array(ciphertext), iv, secretKey: key }
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

    // Convert data to Uint8Array if it is a string
    let dataBuffer: Uint8Array
    if (typeof data === 'string') {
        dataBuffer = Buffer.from(data, 'base64')
    } else {
        dataBuffer = data
    }

    const encryptedBuffer = Buffer.from(
        dataBuffer.buffer,
        dataBuffer.byteOffset,
        dataBuffer.byteLength,
    )
    const authTag = new Uint8Array(
        encryptedBuffer.buffer.slice(
            encryptedBuffer.byteOffset + encryptedBuffer.length - 16,
            encryptedBuffer.byteOffset + encryptedBuffer.length,
        ),
    )
    const encryptedContent = new Uint8Array(
        encryptedBuffer.buffer.slice(
            encryptedBuffer.byteOffset,
            encryptedBuffer.byteOffset + encryptedBuffer.length - 16,
        ),
    )

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()])
    return new Uint8Array(decrypted.buffer, decrypted.byteOffset, decrypted.byteLength)
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
