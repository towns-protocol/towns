/**
 * Encrypts a Uint8Array using AES-GCM with a random 256-bit key.
 *
 * The initialization vector (IV) is set to 96 random bits according to
 * https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
 *
 * Secret key + IV are automatically generated and returned along
 * with the ciphertext if none are provided.
 */
import {
    generateNewAesGcmKey,
    exportAesGsmKeyBytes,
    encryptAesGcm,
} from '@towns-protocol/encryption'

export type EncryptedChunk = {
    ciphertext: Uint8Array
    iv: Uint8Array
}

export type EncryptionResult = {
    chunks: EncryptedChunk[]
    secretKey: Uint8Array
}

export async function encryptAESGCM(
    data: Uint8Array,
    chunkSize: number,
): Promise<EncryptionResult> {
    if (!data || data.length === 0) {
        throw new Error('Cannot encrypt undefined or empty data')
    }

    const cryptoKey = await generateNewAesGcmKey()
    const secretKey = await exportAesGsmKeyBytes(cryptoKey)
    const encryptedData = await encryptAesGcm(cryptoKey, data)

    const chunks: EncryptedChunk[] = []
    for (let i = 0; i < encryptedData.ciphertext.length; i += chunkSize) {
        chunks.push({
            ciphertext: encryptedData.ciphertext.slice(i, i + chunkSize),
            iv: encryptedData.iv,
        })
    }

    return {
        chunks,
        secretKey,
    }
}

export async function encryptChunkedAESGCM(
    data: Uint8Array,
    chunkSize: number,
): Promise<EncryptionResult> {
    if (!data || data.length === 0) {
        throw new Error('Cannot encrypt undefined or empty data')
    }

    const cryptoKey = await generateNewAesGcmKey()
    const secretKey = await exportAesGsmKeyBytes(cryptoKey)

    // Adjust chunk size to account for AES-GCM overhead (16-byte auth tag)
    const maxPlaintextSize = chunkSize - 16
    const chunks: EncryptedChunk[] = []
    let offset = 0
    while (offset < data.length) {
        const dataChunk = data.slice(offset, offset + maxPlaintextSize)
        const encryptedChunk = await encryptAesGcm(cryptoKey, dataChunk)
        if (encryptedChunk.ciphertext.byteLength > chunkSize) {
            throw new Error(`Encrypted chunk exceeds chunkSize. Adjust chunkSize.`)
        }
        chunks.push(encryptedChunk)
        offset += maxPlaintextSize
    }

    return { chunks, secretKey }
}

export async function decryptAESGCM({
    ciphertext,
    secretKey,
    iv,
}: {
    ciphertext: Uint8Array
    secretKey: Uint8Array
    iv: Uint8Array
}): Promise<Uint8Array> {
    if (secretKey.length !== 32) {
        throw new Error('Invalid key length. AES-256-GCM requires a 32-byte key.')
    }

    if (iv.length !== 12) {
        throw new Error('Invalid IV length. AES-256-GCM requires a 12-byte IV.')
    }

    const aesCryptoKey = await window.crypto.subtle.importKey(
        'raw',
        secretKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
    )

    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesCryptoKey,
        ciphertext,
    )
    return new Uint8Array(decrypted)
}
