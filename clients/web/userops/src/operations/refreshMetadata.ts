import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'

export async function refreshMetadata(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['refreshMetadata']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [spaceId, signer] = fnArgs
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const space = spaceDapp.getSpace(spaceId)
    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }
    const callData = space.Membership.metadata.encodeFunctionData('refreshMetadata', [])

    return sendUserOp({
        toAddress: space.Address,
        callData,
        signer,
        spaceId,
        functionHashForPaymasterProxy: 'refreshMetadata',
    })
}
