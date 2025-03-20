import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'

export async function updateSpaceInfo(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['updateSpaceInfo']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const [spaceId, spaceName, uri, shortDescription, longDescription, signer] = fnArgs
    const space = spaceDapp.getSpace(spaceId)

    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    // the function name in the contract is updateSpaceInfo
    // in space dapp we update the space name only using updateSpaceInfo which calls updateSpaceInfo
    const functionName = 'updateSpaceInfo'

    const functionHashForPaymasterProxy = getFunctionSigHash(
        space.SpaceOwner.interface,
        functionName,
    )

    const spaceInfo = await space.getSpaceInfo()
    const callData = space.SpaceOwner.encodeFunctionData(functionName, [
        space.Address,
        spaceName,
        uri ?? spaceInfo.uri ?? '',
        shortDescription ?? spaceInfo.shortDescription ?? '',
        longDescription ?? spaceInfo.longDescription ?? '',
    ])

    return sendUserOp({
        toAddress: space.SpaceOwner.address,
        callData: callData,
        spaceId: spaceId,
        signer,
        functionHashForPaymasterProxy,
    })
}
