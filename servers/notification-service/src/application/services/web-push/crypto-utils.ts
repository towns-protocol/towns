import { VapidDetails, WebPushSubscription, WebPushSubscriptionKeys } from './web-push-types'
import {
    arrayBufferToBase64UrlEncoded,
    base64ToUrlEncoding,
    base64UrlDecode,
    base64UrlDecodeString,
    concatTypedArrays,
    urlEncodedBase64ToUint8Array,
} from './utils'

import { JwtData, JwtInfo } from './jwt'

export async function sign(jwk: JsonWebKey, jwtData: JwtData): Promise<string> {
    const jwtInfo: JwtInfo = {
        typ: 'JWT',
        alg: 'ES256',
    }
    const base64JwtInfo = base64ToUrlEncoding(JSON.stringify(jwtInfo))
    const base64JwtData = base64ToUrlEncoding(JSON.stringify(jwtData))
    const unsignedToken = `${base64JwtInfo}.${base64JwtData}`
    const privateKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign'],
    )
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        privateKey,
        new TextEncoder().encode(unsignedToken),
    )
    const base64Signature = base64ToUrlEncoding(signature)

    return `${base64JwtInfo}.${base64JwtData}.${base64Signature}`
}

export function vapidKeysToJsonWebKey(vapidDetails: VapidDetails): JsonWebKey {
    const jwk = {
        kty: 'EC',
        crv: 'P-256',
        key_ops: ['sign'],
        ext: true,
        d: arrayBufferToBase64UrlEncoded(urlEncodedBase64ToUint8Array(vapidDetails.privateKey)),
        x: arrayBufferToBase64UrlEncoded(
            urlEncodedBase64ToUint8Array(vapidDetails.publicKey).slice(1, 33),
        ),
        y: arrayBufferToBase64UrlEncoded(
            urlEncodedBase64ToUint8Array(vapidDetails.publicKey).slice(33, 66),
        ),
    }
    return jwk
}

export function getPublicKeyFromJwk(jwk: JsonWebKey) {
    if (!jwk.x || !jwk.y) {
        throw new Error('Invalid JWK because it does not contain x and y values')
    }
    return base64ToUrlEncoding(
        '\x04' + atob(base64UrlDecodeString(jwk.x)) + atob(base64UrlDecodeString(jwk.y)),
    )
}

export async function encrypt(
    payload: string,
    target: WebPushSubscription,
    salt: Uint8Array,
    localKeys: CryptoKeyPair,
): Promise<ArrayBuffer> {
    const clientKeys = await importClientKeys(target.keys)
    const sharedSecret = await deriveSharedSecret(clientKeys.p256, localKeys.privateKey)
    const pseudoRandomKey = await derivePsuedoRandomKey(clientKeys.auth, sharedSecret)
    const context = await createContext(clientKeys.p256, localKeys.publicKey)
    const nonce = await deriveNonce(pseudoRandomKey, salt, context)
    const contentEncryptionKey = await deriveContentEncryptionKey(pseudoRandomKey, salt, context)
    const encodedPayload = new TextEncoder().encode(payload)
    const paddedPayload = padPayload(encodedPayload)
    return crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: nonce,
        },
        contentEncryptionKey,
        paddedPayload,
    )
}

function padPayload(payload: Uint8Array): Uint8Array {
    // https://developer.chrome.com/blog/web-push-encryption/#encryption
    // Web push payloads have an overall max size of 4KB (4096 bytes). With the
    // required overhead for encryption etc our actual max payload size is 4078.
    // Calculated as follows:
    // 4096 bytes maximum per post, with 16-bytes for encryption information and
    // at least 2 bytes for padding.
    const MAX_PAYLOAD_SIZE = 4078
    let paddingSize = Math.round(Math.random() * 1000)
    // +2 because we need to use 2 bytes to indicate padding length
    const payloadSizeWithPadding = payload.byteLength + paddingSize + 2
    if (payloadSizeWithPadding > MAX_PAYLOAD_SIZE) {
        // if the payload is already too big, trim down the padding
        paddingSize -= MAX_PAYLOAD_SIZE - payload.byteLength
    }
    const arrayWithPadding = new ArrayBuffer(2 + paddingSize)
    const dataView = new DataView(arrayWithPadding)
    // store the padding size in the first 2 bytes
    dataView.setUint16(0, paddingSize)
    return concatTypedArrays([new Uint8Array(arrayWithPadding), payload])
}

async function deriveContentEncryptionKey(
    pseudoRandomKey: CryptoKey,
    salt: Uint8Array,
    context: Uint8Array,
): Promise<CryptoKey> {
    const contentEncryptionKeyInfo = concatTypedArrays([
        new TextEncoder().encode('Content-Encoding: aesgcm\0'),
        context,
    ])
    const contentEncryptionKeyBytes = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt,
            info: contentEncryptionKeyInfo,
        },
        pseudoRandomKey,
        16 * 8,
    )
    return crypto.subtle.importKey('raw', contentEncryptionKeyBytes, 'AES-GCM', false, ['encrypt'])
}

async function deriveNonce(
    pseudoRandomKey: CryptoKey,
    salt: ArrayBuffer,
    context: Uint8Array,
): Promise<ArrayBuffer> {
    const nonceInfo = concatTypedArrays([
        new TextEncoder().encode('Content-Encoding: nonce\0'),
        context,
    ])
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt,
            info: nonceInfo,
        },
        pseudoRandomKey,
        12 * 8,
    )
    return derivedBits
}

async function createContext(
    clientPublicKey: CryptoKey,
    localPublicKey: CryptoKey,
): Promise<Uint8Array> {
    const [clientPublicKeyBytes, localPublicKeyBytes] = (await Promise.all([
        crypto.subtle.exportKey('raw', clientPublicKey),
        crypto.subtle.exportKey('raw', localPublicKey),
    ])) as [ArrayBuffer, ArrayBuffer]
    return concatTypedArrays([
        new TextEncoder().encode('P-256\0'),
        new Uint8Array([0, clientPublicKeyBytes.byteLength]),
        new Uint8Array(clientPublicKeyBytes),
        new Uint8Array([0, localPublicKeyBytes.byteLength]),
        new Uint8Array(localPublicKeyBytes),
    ])
}

async function derivePsuedoRandomKey(
    auth: ArrayBuffer,
    sharedSecret: CryptoKey,
): Promise<CryptoKey> {
    const pseudoRandomKeyBytes = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: auth,
            // Adding Content-Encoding data info here is required by the Web Push API
            info: new TextEncoder().encode('Content-Encoding: auth\0'),
        },
        sharedSecret,
        256,
    )
    return crypto.subtle.importKey('raw', pseudoRandomKeyBytes, 'HKDF', false, ['deriveBits'])
}

async function deriveSharedSecret(
    clientPublicKey: CryptoKey,
    localPrivateKey: CryptoKey,
): Promise<CryptoKey> {
    const sharedSecretBytes = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: clientPublicKey },
        localPrivateKey,
        256,
    )
    // convert to HKDF key
    // https://en.wikipedia.org/wiki/HKDF
    return crypto.subtle.importKey('raw', sharedSecretBytes, { name: 'HKDF' }, false, [
        'deriveKey',
        'deriveBits',
    ])
}

async function importClientKeys(keys: WebPushSubscriptionKeys) {
    const auth = base64UrlDecode(keys.auth)
    if (auth.byteLength !== 16) {
        throw new Error(`auth must be 16 bytes, got ${auth.byteLength}`)
    }
    const key = atob(base64UrlDecodeString(keys.p256dh))
    const p256 = await crypto.subtle.importKey(
        'jwk',
        {
            kty: 'EC',
            crv: 'P-256',
            x: base64ToUrlEncoding(key.slice(1, 33)),
            y: base64ToUrlEncoding(key.slice(33, 65)),
            ext: true,
        },
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        [],
    )
    return {
        auth,
        p256,
    }
}
