import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'

export async function checkIn(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['airdrop']['checkIn']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [signer] = fnArgs

    const riverPoints = spaceDapp?.airdrop?.riverPoints

    if (!riverPoints?.address) {
        throw new Error('riverPoints is required')
    }

    const callData = riverPoints.encodeFunctionData('checkIn', [])

    return sendUserOp({
        toAddress: riverPoints.address,
        spaceId: undefined,
        callData,
        signer,
        functionHashForPaymasterProxy: 'checkIn',
    })
}
