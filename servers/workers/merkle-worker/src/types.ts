import { ErrorCode } from './createResponse'

export interface Claim {
    address: string
    amount: string
}

export interface VerifyProofRequest {
    conditionId: string
    merkleRoot: string
    proof: string[]
    leaf: [Claim['address'], Claim['amount']]
}

export interface MerkleTreeDump {
    format: string
    tree: string[]
    values: {
        value: [Claim['address'], Claim['amount']]
        treeIndex: number
    }[]
    leafEncoding: ['address', 'uint256']
}

export interface MerkleData {
    merkleRoot: string
    claims: Claim[]
    treeDump: MerkleTreeDump
}

export type MerkleProofResponse = {
    proof: string[]
    leaf: [string, string] // [address, amount]
}

export type ApiSuccessResponse<T> = {
    success: true
    message: string
    data?: T
    /**
     * @deprecated
     * backwards compatibility for fields added directly in response
     * clients should migrate to data field
     */
    [key: string]: unknown
}

export type ApiErrorResponse = {
    success: false
    message: string
    errorDetail: {
        code: ErrorCode
        description: string
    }
    /**
     * @deprecated
     * backwards compatibility for old error string
     * clients should migrate to errorDetail field
     */
    error: string
}
