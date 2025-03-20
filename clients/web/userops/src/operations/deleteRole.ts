import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'

export async function deleteRole(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['deleteRole']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [spaceId, roleId, signer] = fnArgs

    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const space = spaceDapp.getSpace(spaceId)
    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }
    const functionName = 'removeRole'

    const functionHashForPaymasterProxy = getFunctionSigHash(space.Roles.interface, functionName)

    const callData = space.Roles.encodeFunctionData(functionName, [roleId])

    return sendUserOp({
        toAddress: [space.Roles.address],
        callData: [callData],
        signer,
        spaceId: spaceId,
        functionHashForPaymasterProxy,
    })
}
