/**
 * Encrypts a Uint8Array using AES-GCM with a random 256-bit key.
 *
 * The initialization vector (IV) is set to 96 random bits according to
 * https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
 *
 * Secret key + IV are automatically generated and returned along
 * with the ciphertext.
 */

export async function encryptAESGCM(data: Uint8Array) {
    // Generate 256-bit secret key
    const secretKey = crypto.getRandomValues(new Uint8Array(32))

    // Generate 96 bits initialization vector for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const aesCryptoKey = await crypto.subtle.importKey(
        'raw',
        secretKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt'],
    )

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesCryptoKey, data)

    return {
        ciphertext: new Uint8Array(ciphertext),
        iv,
        secretKey: secretKey,
    }
}

export async function decryptAESGCM(data: Uint8Array, iv: Uint8Array, secretKey: Uint8Array) {
    const aesCryptoKey = await crypto.subtle.importKey(
        'raw',
        secretKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
    )

    // `decrypt` will throw an error if the integrity check fails
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesCryptoKey, data)
    return new Uint8Array(decrypted)
}
