import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { encodeLegacyUpdateRoleData, encodeUpdateRoleData } from '../utils/encodeUpdateRoleData'

export async function updateRole(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['updateRole']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [updateRoleParams, signer] = fnArgs
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const space = spaceDapp.getSpace(updateRoleParams.spaceNetworkId)
    if (!space) {
        throw new Error(`Space with spaceId "${updateRoleParams.spaceNetworkId}" is not found.`)
    }
    const { functionHashForPaymasterProxy, callData } = await encodeUpdateRoleData({
        space,
        updateRoleParams,
        spaceDapp,
    })

    return sendUserOp({
        toAddress: [space.Roles.address],
        callData: [callData],
        signer,
        spaceId: updateRoleParams.spaceNetworkId,
        functionHashForPaymasterProxy,
    })
}

export async function legacyUpdateRole(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['legacyUpdateRole']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [legacyUpdateRoleParams, signer] = fnArgs
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const space = spaceDapp.getSpace(legacyUpdateRoleParams.spaceNetworkId)
    if (!space) {
        throw new Error(
            `Space with spaceId "${legacyUpdateRoleParams.spaceNetworkId}" is not found.`,
        )
    }
    const { functionHashForPaymasterProxy, callData } = await encodeLegacyUpdateRoleData({
        space,
        legacyUpdateRoleParams,
    })

    return sendUserOp({
        toAddress: [space.Roles.address],
        callData: [callData],
        signer,
        spaceId: legacyUpdateRoleParams.spaceNetworkId,
        functionHashForPaymasterProxy,
    })
}
