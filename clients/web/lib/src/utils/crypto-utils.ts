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
    if (data === undefined || data.length === 0) {
        throw new Error('Cannot encrypt undefined or empty data')
    }

    // Generate 256-bit secret key
    const cryptoKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
    )

    // Generate 96 bits initialization vector for AES-GCM
    // https://github.com/mdn/dom-examples/blob/main/web-crypto/encrypt-decrypt/aes-gcm.js#L27
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data)
    const secretKey = new Uint8Array(await window.crypto.subtle.exportKey('raw', cryptoKey))

    return {
        ciphertext: new Uint8Array(ciphertext),
        iv,
        secretKey: secretKey,
    }
}

export async function decryptAESGCM(data: Uint8Array, iv: Uint8Array, secretKey: Uint8Array) {
    const aesCryptoKey = await window.crypto.subtle.importKey(
        'raw',
        secretKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
    )

    // `decrypt` will throw an error if the integrity check fails
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesCryptoKey,
        data,
    )
    return new Uint8Array(decrypted)
}
