export async function generateNewAesGcmKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportAesGsmKeyBytes(key: CryptoKey): Promise<Uint8Array> {
    const exportedKey = await crypto.subtle.exportKey('raw', key)
    return new Uint8Array(exportedKey)
}

export async function importAesGsmKeyBytes(key: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey('raw', key, 'AES-GCM', true, ['encrypt', 'decrypt'])
}

export async function encryptAesGcm(
    key: CryptoKey,
    data: Uint8Array,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
    // If data is empty, it's obvious what the message is from the result length.
    if (data.length === 0) {
        throw new Error('Data to encrypt cannot be empty')
    }
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        key,
        data,
    )
    return { ciphertext: new Uint8Array(encrypted), iv }
}

export async function decryptAesGcm(
    key: CryptoKey,
    ciphertext: Uint8Array,
    iv: Uint8Array,
): Promise<Uint8Array> {
    if (iv.length !== 12) {
        throw new Error('IV must be 12 bytes')
    }
    if (ciphertext.length < 17) {
        throw new Error('Ciphertext can not be this short')
    }
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        key,
        ciphertext,
    )
    return new Uint8Array(decrypted)
}
