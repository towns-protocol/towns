import {
    IReview,
    IReviewInterface,
    ReviewStorage,
} from '@river-build/generated/dev/typings/IReview'

import { ContractTransaction, ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

import DevAbi from '@river-build/generated/dev/abis/IReview.abi.json' assert { type: 'json' }
import { Address } from 'abitype'

// solidity doesn't export enums, so we need to define them here, boooooo
export enum SpaceReviewAction {
    None = -1,
    Add = 0,
    Update = 1,
    Delete = 2,
}

export interface ReviewParams {
    rating: number
    comment: string
}

export class IReviewShim extends BaseContractShim<IReview, IReviewInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }

    /**
     * Get the review for a user
     * @param userAddress - The address of the user to get the review for
     * @returns The review for the user
     */
    public async getReview(userAddress: Address): Promise<ReviewStorage.ContentStructOutput> {
        const review = await this.read.getReview(userAddress)
        return review
    }

    /**
     * Get all reviews
     * @returns All reviews
     */
    public async getAllReviews(): Promise<
        [string[], ReviewStorage.ContentStructOutput[]] & {
            users: string[]
            reviews: ReviewStorage.ContentStructOutput[]
        }
    > {
        const reviews = await this.read.getAllReviews()
        return reviews
    }

    public async addReview(
        params: ReviewParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        return this.write(signer).setReview(SpaceReviewAction.Add, this.encodeReviewParams(params))
    }

    public async updateReview(
        params: ReviewParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        return this.write(signer).setReview(
            SpaceReviewAction.Update,
            this.encodeReviewParams(params),
        )
    }

    public async deleteReview(signer: ethers.Signer): Promise<ContractTransaction> {
        return this.write(signer).setReview(
            SpaceReviewAction.Delete,
            ethers.utils.defaultAbiCoder.encode(['string'], ['']),
        )
    }

    private encodeReviewParams(params: ReviewParams): string {
        return ethers.utils.defaultAbiCoder.encode(
            ['tuple(string,uint8)'],
            [[params.comment, params.rating]],
        )
    }
}

/**
 * Get the review event data from a receipt, public static for ease of use in the SDK
 * @param receipt - The receipt of the transaction
 * @param senderAddress - The address of the sender
 * @returns The review event data
 */
export function getSpaceReviewEventData(
    logs: { topics: string[]; data: string }[],
    senderAddress: string,
): { comment?: string; rating: number; kind: SpaceReviewAction } {
    const contractInterface = new ethers.utils.Interface(DevAbi) as IReviewInterface
    for (const log of logs) {
        const parsedLog = contractInterface.parseLog(log)
        if (
            parsedLog.name === 'ReviewAdded' &&
            (parsedLog.args.user as string).toLowerCase() === senderAddress.toLowerCase()
        ) {
            return {
                comment: (parsedLog.args.review as ReviewStorage.ContentStructOutput)[0],
                rating: (parsedLog.args.review as ReviewStorage.ContentStructOutput)[1],
                kind: SpaceReviewAction.Add,
            }
        } else if (
            parsedLog.name === 'ReviewUpdated' &&
            (parsedLog.args.user as string).toLowerCase() === senderAddress.toLowerCase()
        ) {
            return {
                comment: (parsedLog.args.review as ReviewStorage.ContentStructOutput)[0],
                rating: (parsedLog.args.review as ReviewStorage.ContentStructOutput)[1],
                kind: SpaceReviewAction.Update,
            }
        } else if (
            parsedLog.name === 'ReviewDeleted' &&
            (parsedLog.args.user as string).toLowerCase() === senderAddress.toLowerCase()
        ) {
            return {
                comment: undefined,
                rating: 0,
                kind: SpaceReviewAction.Delete,
            }
        }
    }
    return { comment: undefined, rating: 0, kind: SpaceReviewAction.None }
}
