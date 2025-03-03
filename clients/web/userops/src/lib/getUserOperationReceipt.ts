import { BundlerJsonRpcProvider } from 'userop'
import { Address, isHex, toHex, Log as ViemLog } from 'viem'
import { BundlerClient, GetUserOperationReceiptReturnType } from 'viem/account-abstraction'
import { providers } from 'ethers'
import { EthGetUserOperationReceiptResponse } from './types'

export async function getUserOperationReceipt(args: {
    provider: BundlerJsonRpcProvider
    userOpHash: string
}): Promise<EthGetUserOperationReceiptResponse>

export async function getUserOperationReceipt(args: {
    bundlerClient: BundlerClient
    userOpHash: Address
}): Promise<EthGetUserOperationReceiptResponse>

export async function getUserOperationReceipt(args: {
    provider?: BundlerJsonRpcProvider
    bundlerClient?: BundlerClient
    userOpHash: string
}): Promise<EthGetUserOperationReceiptResponse | null> {
    const { provider, bundlerClient, userOpHash } = args

    if (provider) {
        const receipt = (await provider.send('eth_getUserOperationReceipt', [
            userOpHash,
        ])) as EthGetUserOperationReceiptResponse
        return receipt
    }
    if (bundlerClient && isHex(userOpHash)) {
        const receipt = await bundlerClient.request({
            method: 'eth_getUserOperationReceipt',
            params: [userOpHash],
        })

        if (!receipt) {
            return null
        }

        return {
            userOpHash: receipt.userOpHash,
            sender: receipt.sender,
            success: receipt.success,
            receipt: {
                transactionHash: receipt.receipt.transactionHash,
            },
        }
    }

    throw new Error('[getUserOperationReceipt]::Invalid arguments')
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

// TODO: if needed we can use this
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function viemToAlchemyUserOperationReceipt(receipt: GetUserOperationReceiptReturnType) {
    return {
        userOpHash: receipt.userOpHash,
        sender: receipt.sender,
        success: receipt.success,
        paymasterAndData: '0xxxxxxxxxxxxxx', // not provided but don't use it
        actualGasCost: toHex(receipt.actualGasCost),
        actualGasUsed: toHex(receipt.actualGasUsed),
        reason: receipt.reason,
        logs: receipt.logs.map(convertViemLogToEthersLog),
        nonce: toHex(receipt.nonce),
        receipt: {
            blockHash: receipt.receipt.blockHash,
            blockNumber: toHex(receipt.receipt.blockNumber),
            contractAddress: receipt.receipt.contractAddress ?? null,
            cumulativeGasUsed: toHex(receipt.receipt.cumulativeGasUsed),
            effectiveGasPrice: toHex(receipt.receipt.effectiveGasPrice),
            from: receipt.receipt.from,
            gasUsed: toHex(receipt.receipt.gasUsed),
            logs: receipt.receipt.logs,
            logsBloom: receipt.receipt.logsBloom,
            to: receipt.receipt.to ?? '',
            transactionIndex: toHex(receipt.receipt.transactionIndex),
            transactionHash: receipt.receipt.transactionHash,
            type: receipt.receipt.type,
        },
    }
}

function convertViemLogToEthersLog(viemLog: ViemLog): providers.Log {
    return {
        address: viemLog.address,
        blockHash: viemLog.blockHash ?? '',
        blockNumber: viemLog.blockNumber !== null ? Number(viemLog.blockNumber) : 0,
        data: viemLog.data,
        logIndex: viemLog.logIndex !== null ? Number(viemLog.logIndex) : 0,
        topics: viemLog.topics,
        transactionHash: viemLog.transactionHash ?? '',
        transactionIndex: viemLog.transactionIndex !== null ? Number(viemLog.transactionIndex) : 0,
        removed: false, // Viem does not provide this field
    }
}
