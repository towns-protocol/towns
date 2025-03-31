import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'

export async function withdrawSpaceFunds(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['withdrawSpaceFunds']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [spaceId, recipient, signer] = fnArgs
    const space = spaceDapp?.getSpace(spaceId)

    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const callData = space.Treasury.encodeFunctionData('withdraw', [recipient])

    return sendUserOp({
        toAddress: space.Membership.address,
        callData,
        functionHashForPaymasterProxy: 'withdraw',
        signer,
        spaceId: undefined,
    })
}
