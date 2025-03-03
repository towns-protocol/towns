import { FunctionHash } from '../../../types'
import { costOfGas, totalCostOfUserOp } from './balance'
import { NegativeValueException } from '../../../errors'
import { PrepareUserOperationRequest, SmartAccount } from 'viem/account-abstraction'
import { getAction } from 'viem/utils'
import { getBalance } from 'viem/actions'
type AdjustValueRelativeToBalanceArgs = {
    callGasLimit: bigint
    preVerificationGas: bigint
    verificationGasLimit: bigint
    maxFeePerGas: bigint
    value: bigint
    balance: bigint
}
import { decodeExecuteAbi } from '../accounts/simple/abi'
import { Client } from 'viem'

/**
 * Adjusts the value relative to the balance of a wallet
 *
 * This is applicable for instances where the max balance is passed.
 * In this case, the value + gas cost would exceed the balance of the wallet.
 * So, the value is adjusted to subtract the gas cost from the value.
 *
 * @returns the adjusted value or the original value
 */
export function adjustValueRelativeToBalance({
    balance,
    value,
    callGasLimit,
    preVerificationGas,
    verificationGasLimit,
    maxFeePerGas,
}: AdjustValueRelativeToBalanceArgs) {
    const totalCost = totalCostOfUserOp({
        gasLimit: callGasLimit,
        preVerificationGas,
        verificationGasLimit,
        gasPrice: maxFeePerGas,
        value,
    })

    if (totalCost > balance) {
        const gasCost = costOfGas({
            gasLimit: callGasLimit,
            preVerificationGas,
            verificationGasLimit,
            gasPrice: maxFeePerGas,
        })
        const valueMinusGas = value - gasCost

        if (valueMinusGas < 0n) {
            throw new NegativeValueException()
        }

        return valueMinusGas
    } else {
        return value
    }
}

export async function subtractGasFromBalance({
    op,
    client,
    value,
    functionHash,
    smartAccount,
}: {
    op: PrepareUserOperationRequest
    client: Client
    value: bigint
    functionHash: FunctionHash
    smartAccount: SmartAccount
}) {
    if (functionHash !== 'transferEth') {
        return
    }
    const { preVerificationGas, callGasLimit, maxFeePerGas, verificationGasLimit } = op

    if (
        !op.sender ||
        !op.callData ||
        !callGasLimit ||
        !preVerificationGas ||
        !verificationGasLimit ||
        !maxFeePerGas
    ) {
        throw new Error('Missing required properties')
    }

    const balance = await getAction(
        client,
        getBalance,
        'getBalance',
    )({
        address: smartAccount.address,
    })

    const adjustedValue = adjustValueRelativeToBalance({
        balance,
        callGasLimit,
        preVerificationGas,
        verificationGasLimit,
        maxFeePerGas,
        value,
    })

    if (adjustedValue === value) {
        return
    }

    const decodedData = decodeExecuteAbi(op.callData)
    const [to, , data] = decodedData.args
    return smartAccount.encodeCalls([
        {
            to,
            value: adjustedValue,
            data,
        },
    ])
}
