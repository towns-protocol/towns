import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'

export async function removeLink(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['walletLink']['removeLink']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const [rootKeySigner, walletAddressToRemove] = fnArgs

    const walletLink = spaceDapp.walletLink

    const functionName = 'removeLink'

    const functionHashForPaymasterProxy = getFunctionSigHash(
        walletLink.getInterface(),
        functionName,
    )

    const callDataRemoveWalletLink = await walletLink.encodeRemoveLink(
        rootKeySigner,
        walletAddressToRemove,
    )

    return sendUserOp({
        toAddress: spaceDapp.walletLink.address,
        callData: callDataRemoveWalletLink,
        signer: rootKeySigner,
        spaceId: undefined,
        functionHashForPaymasterProxy,
    })
}
