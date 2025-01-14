import { protoBase64 } from '@bufbuild/protobuf'
import {
    bytesToHex,
    bytesToUtf8,
    equalsBytes,
    hexToBytes,
    utf8ToBytes,
} from 'ethereum-cryptography/utils'

export function bin_fromBase64(base64String: string): Uint8Array {
    return protoBase64.dec(base64String)
}

export function bin_toBase64(uint8Array: Uint8Array): string {
    return protoBase64.enc(uint8Array)
}

export function bin_fromHexString(hexString: string): Uint8Array {
    return hexToBytes(hexString)
}

export function bin_toHexString(uint8Array: Uint8Array): string {
    return bytesToHex(uint8Array)
}

export function bin_fromString(str: string): Uint8Array {
    return utf8ToBytes(str)
}

export function bin_toString(buf: Uint8Array): string {
    return bytesToUtf8(buf)
}

export function shortenHexString(s: string): string {
    if (s.startsWith('0x')) {
        return s.length > 12 ? s.slice(0, 6) + '..' + s.slice(-4) : s
    } else {
        return s.length > 10 ? s.slice(0, 4) + '..' + s.slice(-4) : s
    }
}

export function isHexString(value: string): boolean {
    if (value.length === 0 || (value.length & 1) !== 0) {
        return false
    }
    return /^(0x)?[0-9a-fA-F]+$/.test(value)
}

export function bin_equal(
    a: Uint8Array | null | undefined,
    b: Uint8Array | null | undefined,
): boolean {
    if (
        (a === undefined || a === null || a.length === 0) &&
        (b === undefined || b === null || b.length === 0)
    ) {
        return true
    } else if (a === undefined || a === null || b === undefined || b === null) {
        return false
    }
    return equalsBytes(a, b)
}

// Returns the absolute value of this BigInt as a big-endian byte array
export function bigIntToBytes(value: bigint): Uint8Array {
    const abs = value < 0n ? -value : value
    // Calculate the byte length needed to represent the BigInt
    const byteLength = Math.ceil(abs.toString(16).length / 2)

    // Create a buffer of the required length
    const buffer = new Uint8Array(byteLength)

    // Fill the buffer with the big-endian representation of the BigInt
    let temp = abs
    for (let i = byteLength - 1; i >= 0; i--) {
        buffer[i] = Number(temp & 0xffn) // Extract last 8 bits
        temp >>= 8n // Shift right by 8 bits
    }
    return buffer
}
