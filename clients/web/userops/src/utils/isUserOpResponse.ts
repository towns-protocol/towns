import { ContractTransaction } from 'ethers'
import { SendUserOperationResponse } from '../lib/types'

export function isUserOpResponse(
    tx: undefined | ContractTransaction | SendUserOperationResponse,
): tx is SendUserOperationResponse {
    return typeof tx === 'object' && tx !== null && 'userOpHash' in tx && 'wait' in tx
}
