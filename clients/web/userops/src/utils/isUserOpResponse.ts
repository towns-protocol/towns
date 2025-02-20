import { ISendUserOperationResponse } from 'userop'
import { ContractTransaction } from 'ethers'

export function isUserOpResponse(
    tx: undefined | ContractTransaction | ISendUserOperationResponse,
): tx is ISendUserOperationResponse {
    return typeof tx === 'object' && tx !== null && 'userOpHash' in tx && 'wait' in tx
}
