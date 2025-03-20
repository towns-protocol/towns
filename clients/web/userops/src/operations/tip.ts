import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'

export async function tip(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['tip']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [{ spaceId, tokenId, currency, amount, messageId, channelId, receiver }, signer] = fnArgs
    const space = spaceDapp?.getSpace(spaceId)
    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const callData = space.Tipping.encodeFunctionData('tip', [
        {
            receiver,
            tokenId,
            currency,
            amount,
            messageId,
            channelId,
        },
    ])

    return sendUserOp({
        toAddress: space.Address,
        callData,
        signer,
        spaceId,
        value: amount,
        functionHashForPaymasterProxy: 'tip',
    })
}
