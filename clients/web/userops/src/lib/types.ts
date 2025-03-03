import { UserOperationEvent } from './userOperationEvent'

export interface SendUserOperationResponse {
    userOpHash: string
    wait: () => Promise<UserOperationEvent | null>
}

export type EthGetUserOperationReceiptResponse = {
    // TODO: figure this out
    // these are the only props that we care about for now
    userOpHash: string
    sender: string
    success: boolean
    //
    // paymasterAndData: string
    // actualGasCost: string
    // actualGasUsed: string
    // reason?: string
    // logs?: object[]
    // nonce: string
    receipt: {
        //     blockHash: string
        //     blockNumber: string
        //     contractAddress: string | null
        //     cumulativeGasUsed: string
        //     effectiveGasPrice: string
        //     from: string
        //     gasUsed: string
        //     logs: object[]
        //     logsBloom: string
        //     to: string
        //     transactionIndex: string
        transactionHash: string
        //     type: string
    }
}

export type SendUserOperationReturnType = SendUserOperationResponse & {
    getUserOperationReceipt: () => Promise<EthGetUserOperationReceiptResponse | null>
}
