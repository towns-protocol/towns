import { SpaceDapp } from '@river-build/web3'
import { UserOps } from '../UserOperations'

export async function prepayMembership(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['prepayMembership']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [spaceId, prepaidSupply, signer] = fnArgs

    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const space = spaceDapp.getSpace(spaceId)

    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const cost = await space.Prepay.read.calculateMembershipPrepayFee(prepaidSupply)
    const callData = space.Prepay.encodeFunctionData('prepayMembership', [prepaidSupply])
    return sendUserOp({
        toAddress: space.Prepay.address,
        callData,
        signer,
        spaceId,
        value: cost.toBigInt(),
        functionHashForPaymasterProxy: 'prepayMembership',
    })
}
