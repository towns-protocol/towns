import { IUserOperationMiddlewareCtx } from 'userop'
import { BigNumberish, BigNumber, utils } from 'ethers'
import { FunctionHash } from '../../../types'
import { TownsSimpleAccount } from '../TownsSimpleAccount'
import { totalCostOfUserOp, costOfGas } from './balance'
import { NegativeValueException } from '../../../errors'

type AdjustValueRelativeToBalanceArgs = {
    callGasLimit: BigNumberish
    preVerificationGas: BigNumberish
    verificationGasLimit: BigNumberish
    maxFeePerGas: BigNumberish
    value: BigNumberish
    balance: BigNumberish
}

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

    if (totalCost.gte(balance)) {
        const gasCost = costOfGas({
            gasLimit: callGasLimit,
            preVerificationGas,
            verificationGasLimit,
            gasPrice: maxFeePerGas,
        })
        const valueMinusGas = BigNumber.from(value).sub(gasCost)

        if (valueMinusGas.isNegative()) {
            throw new NegativeValueException()
        }

        return valueMinusGas
    } else {
        return value
    }
}

export async function subtractGasFromBalance(
    ctx: IUserOperationMiddlewareCtx,
    {
        builder,
        value,
        functionHash,
    }: {
        builder: TownsSimpleAccount
        value: BigNumberish
        functionHash: FunctionHash
    },
) {
    if (functionHash !== 'transferEth') {
        return
    }
    const { preVerificationGas, callGasLimit, maxFeePerGas, verificationGasLimit } = ctx.op

    const balance = await builder.provider.getBalance(ctx.op.sender)

    const adjustedValue = adjustValueRelativeToBalance({
        balance,
        callGasLimit,
        preVerificationGas,
        verificationGasLimit,
        maxFeePerGas,
        value,
    })

    if (BigNumber.from(adjustedValue).eq(value)) {
        return
    }

    const decodedData = builder.decodeExecute(ctx.op.callData)
    const [to, , data] = decodedData
    if (typeof to === 'string' && utils.isBytesLike(data)) {
        const newCallData = builder.proxy.interface.encodeFunctionData('execute', [
            to,
            adjustedValue,
            data,
        ])
        ctx.op.callData = newCallData
    }
}
