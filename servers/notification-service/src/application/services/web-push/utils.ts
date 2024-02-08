export function arrayBufferToBase64UrlEncoded(buf: ArrayBuffer): string {
    let binary = ''
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\//g, '_').replace(/=/g, '').replace(/\+/g, '-')
}

export function arrayBufferToString(s: ArrayBuffer): string {
    let result = ''
    for (const code of new Uint8Array(s)) {
        result += String.fromCharCode(code)
    }
    return result
}

export function base64UrlDecode(s: string): ArrayBuffer {
    return new Uint8Array(
        atob(base64UrlDecodeString(s))
            .split('')
            .map((char) => char.charCodeAt(0)),
    ).buffer
}

export function base64UrlDecodeString(s: string): string {
    return s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
}

export function base64ToUrlEncoding(s: string | ArrayBuffer): string {
    const text = typeof s === 'string' ? s : arrayBufferToString(s)
    return btoa(text).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function concatTypedArrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((acc, arr) => acc + arr.byteLength, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const arr of arrays) {
        result.set(arr, offset)
        offset += arr.byteLength
    }
    return result
}

export function urlEncodedBase64ToUint8Array(urlEncodedBase64String: string): Uint8Array {
    const padding = '='.repeat((4 - (urlEncodedBase64String.length % 4)) % 4)
    const base64 = (urlEncodedBase64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}
