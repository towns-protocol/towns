import { Address, SpaceDapp } from '@towns-protocol/web3'
import { ethers } from 'ethers'

export async function encodeDataForLinkingSmartAccount(
    spaceDapp: SpaceDapp,
    rootKeySigner: ethers.Signer,
    abstractAccountAddress: Address,
) {
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }

    if (!abstractAccountAddress) {
        throw new Error('abstractAccountAddress is required')
    }

    return spaceDapp.walletLink.encodeLinkCallerToRootKey(rootKeySigner, abstractAccountAddress)
}
