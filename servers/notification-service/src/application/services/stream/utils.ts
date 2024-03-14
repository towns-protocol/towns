import { utils } from 'ethers'
import { hexToBytes } from 'ethereum-cryptography/utils'
import { bytesToHex } from 'ethereum-cryptography/utils'

export function bin_toHexString(uint8Array: Uint8Array): string {
    return bytesToHex(uint8Array)
}

export function userIdFromAddress(address: Uint8Array): string {
    return utils.getAddress(bin_toHexString(address))
}

export function bin_fromHexString(hexString: string): Uint8Array {
    return hexToBytes(hexString)
}

export function streamIdToBytes(streamId: string): Uint8Array {
    return bin_fromHexString(streamId)
}

export function streamIdFromBytes(bytes: Uint8Array): string {
    return bin_toHexString(bytes)
}

export function streamIdAsString(streamId: string | Uint8Array): string {
    return typeof streamId === 'string' ? streamId : streamIdFromBytes(streamId)
}
