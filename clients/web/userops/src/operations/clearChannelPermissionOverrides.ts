import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { encodeClearChannelRoleOverrides } from '../utils/encodeClearChannelRoleOverrides'

export async function clearChannelPermissionOverrides(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['clearChannelPermissionOverrides']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [contractParams, signer] = fnArgs

    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }

    const space = spaceDapp.getSpace(contractParams.spaceNetworkId)

    if (!space) {
        throw new Error(`Space with spaceId "${contractParams.spaceNetworkId}" is not found.`)
    }

    const { functionHashForPaymasterProxy, callData } = encodeClearChannelRoleOverrides({
        space,
        contractParams,
    })

    return sendUserOp({
        toAddress: [space.Roles.address],
        callData: [callData],
        signer,
        spaceId: contractParams.spaceNetworkId,
        functionHashForPaymasterProxy,
    })
}
