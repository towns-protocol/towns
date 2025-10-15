/**
 * Delegate wallet authentication utilities
 *
 * These functions support delegate wallet signatures where a primary wallet
 * authorizes a device/delegate wallet to sign on its behalf with an expiry time.
 */

import { ecrecover, fromRPCSig, hashPersonalMessage } from '@ethereumjs/util'
import { bin_fromHexString, bin_toHexString } from './binary'
import { check } from './check'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { abytes } from '@noble/hashes/utils'

// Header for delegate signature 'RIVERSIG'
const RIVER_SIG_HEADER = new Uint8Array([82, 73, 86, 69, 82, 83, 73, 71])

function bigintToUint8Array64(num: bigint, endianMode: 'bigEndian' | 'littleEndian'): Uint8Array {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setBigInt64(0, num, endianMode === 'littleEndian') // true for little endian
    return new Uint8Array(buffer)
}

/**
 * Creates the hash source for delegate authorization signature
 *
 * @param devicePublicKey - Uncompressed public key (64 or 65 bytes)
 * @param expiryEpochMs - Expiry timestamp in milliseconds (0 = no expiry)
 * @returns Hash source to be signed by primary wallet
 */
export function riverDelegateHashSrc(
    devicePublicKey: Uint8Array,
    expiryEpochMs: bigint,
): Uint8Array {
    abytes(devicePublicKey)
    check(expiryEpochMs >= 0, 'Expiry should be positive')
    check(devicePublicKey.length === 64 || devicePublicKey.length === 65, 'Bad public key')
    const expiryBytes = bigintToUint8Array64(expiryEpochMs, 'littleEndian')
    const retVal = new Uint8Array(
        RIVER_SIG_HEADER.length + devicePublicKey.length + expiryBytes.length,
    )
    retVal.set(RIVER_SIG_HEADER)
    retVal.set(devicePublicKey, RIVER_SIG_HEADER.length)
    retVal.set(expiryBytes, RIVER_SIG_HEADER.length + devicePublicKey.length)
    return retVal
}

/**
 * Converts uncompressed public key from string to Uint8Array
 *
 * @param publicKey - Public key string starting with '0x04' (132 chars total)
 * @returns Public key as Uint8Array
 */
export function publicKeyToUint8Array(publicKey: string): Uint8Array {
    // Uncompressed public key in string form should start with '0x04'.
    check(
        typeof publicKey === 'string' && publicKey.startsWith('0x04') && publicKey.length === 132,
        'Bad public key',
    )
    return bin_fromHexString(publicKey)
}

/**
 * Derives Ethereum address from public key
 *
 * @param publicKey - Uncompressed public key (64 or 65 bytes)
 * @returns 20-byte Ethereum address
 */
export function publicKeyToAddress(publicKey: Uint8Array): Uint8Array {
    abytes(publicKey, 64, 65)
    if (publicKey.length === 65) {
        publicKey = publicKey.slice(1)
    }
    return keccak256(publicKey).slice(-20)
}

/**
 * Recovers the primary wallet address from a delegate signature
 *
 * This verifies that a delegate wallet was authorized by a primary wallet
 * by recovering the primary wallet's address from the delegate authorization signature.
 *
 * @param params.delegatePubKey - Delegate wallet's public key (string or Uint8Array)
 * @param params.delegateSig - Signature from primary wallet authorizing the delegate
 * @param params.expiryEpochMs - Expiry timestamp that was signed
 * @returns Primary wallet address (20 bytes)
 */
export function recoverPublicKeyFromDelegateSig(params: {
    delegatePubKey: Uint8Array | string
    delegateSig: Uint8Array
    expiryEpochMs: bigint
}): Uint8Array {
    const { delegateSig, expiryEpochMs } = params
    const delegatePubKey =
        typeof params.delegatePubKey === 'string'
            ? publicKeyToUint8Array(params.delegatePubKey)
            : params.delegatePubKey
    const hashSource = riverDelegateHashSrc(delegatePubKey, expiryEpochMs)
    const hash = hashPersonalMessage(hashSource)
    const { v, r, s } = fromRPCSig(('0x' + bin_toHexString(delegateSig)) as `0x${string}`)
    const recoveredCreatorPubKey = ecrecover(hash, v, r, s)
    const recoveredCreatorAddress = Uint8Array.from(publicKeyToAddress(recoveredCreatorPubKey))
    return recoveredCreatorAddress
}
