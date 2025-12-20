import { type ByteArray, type Hex } from 'viem'
import { bytesToString, toBytes } from 'viem/utils'

export function dnsDecodeName(encodedName: Hex): string {
    const bytesName = toBytes(encodedName)
    return bytesToPacket(bytesName)
}

// Taken from ensjs https://github.com/ensdomains/ensjs/blob/main/packages/ensjs/src/utils/hexEncodedName.ts
function bytesToPacket(bytes: ByteArray): string {
    let offset = 0
    let result = ''

    while (offset < bytes.length) {
        const len = bytes[offset]
        if (len === 0) {
            offset += 1
            break
        }

        result += `${bytesToString(bytes.subarray(offset + 1, offset + len + 1))}.`
        offset += len + 1
    }

    return result.replace(/\.$/, '')
}
