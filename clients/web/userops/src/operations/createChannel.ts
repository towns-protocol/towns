import { SpaceDapp, stringifyChannelMetadataJSON } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'

export async function createChannel(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['createChannelWithPermissionOverrides']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const [spaceId, channelName, channelDescription, channelNetworkId, roles, signer] = fnArgs
    const channelId = channelNetworkId.startsWith('0x') ? channelNetworkId : `0x${channelNetworkId}`

    const space = spaceDapp.getSpace(spaceId)

    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const functionName = 'createChannelWithOverridePermissions'

    const functionHashForPaymasterProxy = getFunctionSigHash(space.Channels.interface, functionName)
    const callData = space.Channels.encodeFunctionData(functionName, [
        channelId,
        stringifyChannelMetadataJSON({
            name: channelName,
            description: channelDescription,
        }),
        roles,
    ])

    return sendUserOp({
        toAddress: [space.Channels.address],
        callData: [callData],
        signer,
        spaceId: spaceId,
        functionHashForPaymasterProxy,
    })
}
