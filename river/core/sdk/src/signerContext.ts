import { ethers } from 'ethers'
import { SignerContext } from './sign'
import { makeOldRiverDelegateSig } from '@river/encryption'
import { bin_fromHexString } from '@river/dlog'

export async function makeSignerContext(
    primaryWallet: ethers.Signer,
    delegateWallet: ethers.Wallet,
): Promise<SignerContext> {
    const delegateSig = await makeOldRiverDelegateSig(primaryWallet, delegateWallet.publicKey)
    const creatorAddress = await primaryWallet.getAddress()
    return {
        signerPrivateKey: () => delegateWallet.privateKey.slice(2), // remove the 0x prefix
        creatorAddress: bin_fromHexString(creatorAddress),
        delegateSig,
    }
}
