import { BundlerJsonRpcProvider } from 'userop'

export async function getUserOperationReceipt(args: {
    provider: BundlerJsonRpcProvider
    userOpHash: string
}) {
    const { provider, userOpHash } = args
    const receipt = (await provider.send('eth_getUserOperationReceipt', [
        userOpHash,
    ])) as EthGetUserOperationReceiptResponse

    return receipt
}

export function isEthGetUserOperationReceiptResponse(
    receipt: unknown,
): receipt is EthGetUserOperationReceiptResponse {
    const receiptObj = receipt as EthGetUserOperationReceiptResponse
    return (
        receiptObj?.userOpHash !== undefined &&
        receiptObj?.receipt !== undefined &&
        receiptObj?.receipt?.transactionHash !== undefined
    )
}

export type EthGetUserOperationReceiptResponse = {
    userOpHash: string
    sender: string
    success: boolean
    paymasterAndData: string
    actualGasCost: string
    actualGasUsed: string
    reason?: string
    logs?: object[]
    nonce: string
    receipt: {
        blockHash: string
        blockNumber: string
        contractAddress: string | null
        cumulativeGasUsed: string
        effectiveGasPrice: string
        from: string
        gasUsed: string
        logs: object[]
        logsBloom: string
        to: string
        transactionIndex: string
        transactionHash: string
        type: string
    }
}
