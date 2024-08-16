/**
 * Encrypts a Uint8Array using AES-GCM with a random 256-bit key.
 *
 * The initialization vector (IV) is set to 96 random bits according to
 * https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
 *
 * Secret key + IV are automatically generated and returned along
 * with the ciphertext if none are provided.
 */

export type EncryptionResult = {
    ciphertext: Uint8Array
    iv: Uint8Array
    secretKey: Uint8Array
}

export async function encryptAESGCM(data: Uint8Array): Promise<EncryptionResult> {
    if (!data || data.length === 0) {
        throw new Error('Cannot encrypt undefined or empty data')
    }

    const cryptoKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
    )
    const secretKey = new Uint8Array(await window.crypto.subtle.exportKey('raw', cryptoKey))

    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data)

    return {
        ciphertext: new Uint8Array(ciphertext),
        iv,
        secretKey,
    }
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
