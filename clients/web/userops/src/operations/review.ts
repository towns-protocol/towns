import { SpaceDapp } from '@river-build/web3'
import { UserOps } from '../UserOperations'
import { ethers } from 'ethers'

enum SpaceReviewAction {
    Add = 0,
    Update = 1,
    Delete = 2,
}

export interface TownsReviewParams {
    spaceId: string
    rating: number
    comment: string
    isUpdate?: boolean
    isDelete?: boolean
    signer: ethers.Signer
    senderAddress: string
}

export async function review(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: [TownsReviewParams, ethers.Signer]
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [{ spaceId, rating, comment, isUpdate, isDelete }, signer] = fnArgs
    const space = spaceDapp?.getSpace(spaceId)
    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    let callData: string

    if (isDelete) {
        // For delete, we don't need to encode any review data
        callData = space.Review.encodeFunctionData('setReview', [
            SpaceReviewAction.Delete,
            ethers.utils.defaultAbiCoder.encode(['string'], ['']),
        ])
    } else {
        const encodedData = ethers.utils.defaultAbiCoder.encode(
            ['tuple(string,uint8)'],
            [[comment, rating]],
        )

        callData = space.Review.encodeFunctionData('setReview', [
            isUpdate ? SpaceReviewAction.Update : SpaceReviewAction.Add,
            encodedData,
        ])
    }

    return sendUserOp({
        toAddress: space.Address,
        callData,
        signer,
        spaceId,
        functionHashForPaymasterProxy: 'unsponsored',
    })
}
