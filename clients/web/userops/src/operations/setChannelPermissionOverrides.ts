import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { encodeSetChannelRoleOverrides } from '../utils/encodeSetChannelRoleOverrides'

export async function setChannelPermissionOverrides(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['setChannelPermissionOverrides']>
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

    const { functionHashForPaymasterProxy, callData } = encodeSetChannelRoleOverrides({
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
