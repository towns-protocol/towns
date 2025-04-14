import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'

export async function banWallet(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['banWalletAddress']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [spaceId, walletAddress, signer] = fnArgs
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const space = spaceDapp.getSpace(spaceId)
    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const functionName = 'ban'
    const functionHashForPaymasterProxy = getFunctionSigHash(space.Banning.interface, functionName)

    const tokenId = await space.ERC721AQueryable.read
        .tokensOfOwner(walletAddress)
        .then((tokens) => tokens[0])
    const callData = space.Banning.encodeFunctionData(functionName, [tokenId])

    const op = await sendUserOp({
        toAddress: [space.Banning.address],
        callData: [callData],
        signer,
        spaceId: spaceId,
        functionHashForPaymasterProxy,
    })
    spaceDapp.updateCacheAfterBanOrUnBan(spaceId, tokenId)
    return op
}
