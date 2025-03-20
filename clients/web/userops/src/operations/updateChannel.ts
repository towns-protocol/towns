import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'

export async function updateChannel(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['updateChannel']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [contractParams, signer] = fnArgs
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }

    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const space = spaceDapp.getSpace(contractParams.spaceId)

    if (!space) {
        throw new Error(`Space with spaceId "${contractParams.spaceId}" is not found.`)
    }

    const callData = await spaceDapp.encodedUpdateChannelData(space, contractParams)

    const multiCallData = space.Multicall.encodeFunctionData('multicall', [callData])

    return sendUserOp({
        toAddress: [space.Multicall.address],
        callData: [multiCallData],
        signer,
        spaceId: contractParams.spaceId,
        functionHashForPaymasterProxy: 'updateChannel',
    })
}
