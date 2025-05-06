import { ReviewStorage } from '@towns-protocol/generated/dev/typings/IReview'

import { ContractTransaction, ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { Address } from 'abitype'
import { bin_toHexString } from '@towns-protocol/dlog'
import { IReview__factory } from '@towns-protocol/generated/dev/typings/factories/IReview__factory'

// solidity doesn't export enums, so we need to define them here, boooooo
export enum SpaceReviewAction {
    None = -1,
    Add = 0,
    Update = 1,
    Delete = 2,
}

export interface SpaceReviewEventObject {
    action: SpaceReviewAction
    user: string
    comment?: string
    rating: number
}

export interface ReviewParams {
    rating: number
    comment: string
}

const { abi, connect } = IReview__factory

export class IReviewShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
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

export function getSpaceReviewEventDataBin(
    binLogs: { topics: Uint8Array[]; data: Uint8Array; address: Uint8Array }[],
    from: Uint8Array,
): SpaceReviewEventObject {
    const logs =
        binLogs.map((log) => ({
            address: '0x' + bin_toHexString(log.address),
            topics: log.topics.map((topic) => '0x' + bin_toHexString(topic)),
            data: '0x' + bin_toHexString(log.data),
        })) ?? []
    const senderWallet = '0x' + bin_toHexString(from)
    return getSpaceReviewEventData(logs, senderWallet)
}

/**
 * Get the review event data from a receipt, public static for ease of use in the SDK
 * @param receipt - The receipt of the transaction
 * @param senderAddress - The address of the sender
 * @returns The review event data
 */
export function getSpaceReviewEventData(
    logs: { topics: string[]; data: string; address: string }[],
    senderAddress: string,
): SpaceReviewEventObject {
    const contractInterface = IReview__factory.createInterface()
    for (const log of logs) {
        try {
            const parsedLog = contractInterface.parseLog(log)
            if (
                parsedLog.name === 'ReviewAdded' &&
                (parsedLog.args.user as string).toLowerCase() === senderAddress.toLowerCase()
            ) {
                return {
                    user: parsedLog.args.user,
                    comment: parsedLog.args.comment,
                    rating: parsedLog.args.rating,
                    action: SpaceReviewAction.Add,
                }
            } else if (
                parsedLog.name === 'ReviewUpdated' &&
                (parsedLog.args.user as string).toLowerCase() === senderAddress.toLowerCase()
            ) {
                return {
                    user: parsedLog.args.user,
                    comment: parsedLog.args.comment,
                    rating: parsedLog.args.rating,
                    action: SpaceReviewAction.Update,
                }
            } else if (
                parsedLog.name === 'ReviewDeleted' &&
                (parsedLog.args.user as string).toLowerCase() === senderAddress.toLowerCase()
            ) {
                return {
                    user: parsedLog.args.user,
                    comment: undefined,
                    rating: 0,
                    action: SpaceReviewAction.Delete,
                }
            }
        } catch {
            // no need for error, this log is not from the contract we're interested in
        }
    }
    return { user: '', comment: undefined, rating: 0, action: SpaceReviewAction.None }
}
