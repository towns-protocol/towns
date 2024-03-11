import { ecrecover, fromRpcSig, hashPersonalMessage } from '@ethereumjs/util'
import { ethers } from 'ethers'
import { bin_equal, bin_fromHexString, bin_toHexString, check } from '@river/dlog'
import { publicKeyToAddress, publicKeyToUint8Array } from './sign'
import { Err } from '@river/proto'

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
}

export const checkDelegateSig = (
    devicePubKey: Uint8Array | string,
    creatorAddress: Uint8Array | string,
    delegateSig: Uint8Array,
): void => {
    if (typeof devicePubKey === 'string') {
        devicePubKey = publicKeyToUint8Array(devicePubKey)
    }
    if (typeof creatorAddress === 'string') {
        creatorAddress = bin_fromHexString(creatorAddress)
    }

    const hashSource = devicePubKey

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
): Promise<Uint8Array> {
    if (typeof devicePubKey === 'string') {
        devicePubKey = publicKeyToUint8Array(devicePubKey)
    }
    check(devicePubKey.length === 65, 'Bad public key', Err.BAD_PUBLIC_KEY)
    const hashSrc = devicePubKey
    const delegateSig = bin_fromHexString(await primaryWallet.signMessage(hashSrc))
    return delegateSig
}

export async function makeSignerContext(
    primaryWallet: ethers.Signer,
    delegateWallet: ethers.Wallet,
): Promise<SignerContext> {
    const delegateSig = await makeRiverDelegateSig(primaryWallet, delegateWallet.publicKey)
    const creatorAddress = await primaryWallet.getAddress()
    return {
        signerPrivateKey: () => delegateWallet.privateKey.slice(2), // remove the 0x prefix
        creatorAddress: bin_fromHexString(creatorAddress),
        delegateSig,
    }
}
