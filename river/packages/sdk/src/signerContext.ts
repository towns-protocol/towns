import { ecrecover, fromRpcSig, hashPersonalMessage } from '@ethereumjs/util'
import { ethers } from 'ethers'
import { bin_equal, bin_fromHexString, bin_toHexString, check } from '@river-build/dlog'
import { publicKeyToAddress, publicKeyToUint8Array, riverDelegateHashSrc } from './sign'
import { Err } from '@river-build/proto'

/**
 * SignerContext is a context used for signing events.
 *
 * Two different scenarios are supported:
 *
 * 1. Signing is delegeted from the user key to the device key, and events are signed with device key.
 *    In this case, `signerPrivateKey` should return a device private key, and `delegateSig` should be
 *    a signature of the device public key by the user private key.
 *
 * 2. Events are signed with the user key. In this case, `signerPrivateKey` should return a user private key.
 *    `delegateSig` should be undefined.
 *
 * In both scenarios `creatorAddress` should be set to the user address derived from the user public key.
 *
 * @param signerPrivateKey - a function that returns a private key to sign events
 * @param creatorAddress - a creator, i.e. user address derived from the user public key
 * @param delegateSig - an optional delegate signature
 */
export interface SignerContext {
    signerPrivateKey: () => string
    creatorAddress: Uint8Array
    delegateSig?: Uint8Array
    delegateExpiryEpochMs?: bigint
}

export const checkDelegateSig = (params: {
    delegatePubKey: Uint8Array | string
    creatorAddress: Uint8Array | string
    delegateSig: Uint8Array
    expiryEpochMs: bigint
}): void => {
    const { delegateSig, expiryEpochMs } = params
    const delegatePubKey =
        typeof params.delegatePubKey === 'string'
            ? publicKeyToUint8Array(params.delegatePubKey)
            : params.delegatePubKey
    const creatorAddress =
        typeof params.creatorAddress === 'string'
            ? publicKeyToUint8Array(params.creatorAddress)
            : params.creatorAddress

    const hashSource = riverDelegateHashSrc(delegatePubKey, expiryEpochMs)
    const hash = hashPersonalMessage(Buffer.from(hashSource))
    const { v, r, s } = fromRpcSig('0x' + bin_toHexString(delegateSig))
    const recoveredCreatorPubKey = ecrecover(hash, v, r, s)
    const recoveredCreatorAddress = Uint8Array.from(publicKeyToAddress(recoveredCreatorPubKey))

    check(
        bin_equal(recoveredCreatorAddress, creatorAddress),
        'delegateSig does not match creatorAddress',
        Err.BAD_DELEGATE_SIG,
    )
}

async function makeRiverDelegateSig(
    primaryWallet: ethers.Signer,
    devicePubKey: Uint8Array | string,
    expiryEpochMs: bigint,
): Promise<Uint8Array> {
    if (typeof devicePubKey === 'string') {
        devicePubKey = publicKeyToUint8Array(devicePubKey)
    }
    check(devicePubKey.length === 65, 'Bad public key', Err.BAD_PUBLIC_KEY)
    const hashSrc = riverDelegateHashSrc(devicePubKey, expiryEpochMs)
    const delegateSig = bin_fromHexString(await primaryWallet.signMessage(hashSrc))
    return delegateSig
}

export async function makeSignerContext(
    primaryWallet: ethers.Signer,
    delegateWallet: ethers.Wallet,
    inExpiryEpochMs?:
        | bigint
        | {
              days?: number
              hours?: number
              minutes?: number
              seconds?: number
          },
): Promise<SignerContext> {
    const expiryEpochMs = inExpiryEpochMs ?? 0n // todo make expiry required param once implemented down stream HNT-5213
    const delegateExpiryEpochMs =
        typeof expiryEpochMs === 'bigint' ? expiryEpochMs : makeExpiryEpochMs(expiryEpochMs)
    const delegateSig = await makeRiverDelegateSig(
        primaryWallet,
        delegateWallet.publicKey,
        delegateExpiryEpochMs,
    )
    const creatorAddress = await primaryWallet.getAddress()
    return {
        signerPrivateKey: () => delegateWallet.privateKey.slice(2), // remove the 0x prefix
        creatorAddress: bin_fromHexString(creatorAddress),
        delegateSig,
        delegateExpiryEpochMs,
    }
}

function makeExpiryEpochMs({
    days,
    hours,
    minutes,
    seconds,
}: {
    days?: number
    hours?: number
    minutes?: number
    seconds?: number
}): bigint {
    const MS_PER_SECOND = 1000
    const MS_PER_MINUTE = MS_PER_SECOND * 60
    const MS_PER_HOUR = MS_PER_MINUTE * 60
    const MS_PER_DAY = MS_PER_HOUR * 24

    let delta = 0
    if (days) {
        delta += MS_PER_DAY * days
    }
    if (hours) {
        delta += MS_PER_HOUR * hours
    }
    if (minutes) {
        delta += MS_PER_MINUTE * minutes
    }
    if (seconds) {
        delta += MS_PER_SECOND * seconds
    }
    check(delta != 0, 'Bad expiration, no values were set')
    return BigInt(Date.now() + delta)
}
