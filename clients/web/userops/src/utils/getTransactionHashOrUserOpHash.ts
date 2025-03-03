import { Address } from '@river-build/web3'
import { ContractTransaction } from 'ethers'
import { isUserOpResponse } from './isUserOpResponse'
import { SendUserOperationResponse } from '../lib/types'

export function getTransactionHashOrUserOpHash(
    tx: undefined | ContractTransaction | SendUserOperationResponse,
): Address | undefined {
    if (!tx) {
        return
    }
    if (isUserOpResponse(tx)) {
        return tx.userOpHash as Address
    }
    return tx.hash as Address
}

/**
 * In the case of a user op, wait for the user op to be sent and return the correct transaction hash that a provider can wait for
 */
export async function getTransactionHashFromTransactionOrUserOp(
    tx: undefined | ContractTransaction | SendUserOperationResponse,
) {
    if (isUserOpResponse(tx)) {
        const response = await tx.wait()
        return response?.transactionHash
    }
    return tx?.hash
}
