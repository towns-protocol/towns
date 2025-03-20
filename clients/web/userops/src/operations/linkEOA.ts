import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'

export async function linkEOA(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['walletLink']['linkWalletToRootKey']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const [signer, externalWalletSigner] = fnArgs

    const walletLink = spaceDapp.walletLink
    const functionName = 'linkWalletToRootKey'

    const functionHashForPaymasterProxy = getFunctionSigHash(
        walletLink.getInterface(),
        functionName,
    )

    const callDataForLinkingWallet = await spaceDapp.walletLink.encodeLinkWalletToRootKey(
        signer,
        externalWalletSigner,
    )

    return sendUserOp({
        toAddress: walletLink.address,
        callData: callDataForLinkingWallet,
        signer,
        spaceId: undefined,
        functionHashForPaymasterProxy,
    })
}
