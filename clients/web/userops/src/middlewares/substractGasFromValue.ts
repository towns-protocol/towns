import { IUserOperationMiddlewareCtx } from 'userop'
import { Signer, BigNumberish, BigNumber } from 'ethers'
import { FunctionHash } from '../types'
import { TownsSimpleAccount } from '../TownsSimpleAccount'

export async function subtractGasFromMaxValue(
    ctx: IUserOperationMiddlewareCtx,
    signer: Signer,
    {
        functionHash,
        builder,
        value,
    }: {
        builder: TownsSimpleAccount
        functionHash: FunctionHash
        value: BigNumberish
    },
) {
    if (functionHash !== 'transferEth') {
        return
    }
    const aaAddress = ctx.op.sender
    const aaBalance = await builder.provider.getBalance(aaAddress)

    const {
        preVerificationGas,
        callGasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        verificationGasLimit,
    } = ctx.op
    const sumGas = BigNumber.from(callGasLimit)
        .add(BigNumber.from(preVerificationGas))
        .add(BigNumber.from(verificationGasLimit))
        .add(BigNumber.from(maxPriorityFeePerGas))

    const gasCost = sumGas.mul(BigNumber.from(maxFeePerGas))

    if (BigNumber.from(value).add(gasCost).gte(aaBalance)) {
        const valueMinusGas = BigNumber.from(value).sub(gasCost)
        const decodedData = builder.decodeExecute(ctx.op.callData)
        const [to, , data] = decodedData
        const newCallData = builder.proxy.interface.encodeFunctionData('execute', [
            to,
            valueMinusGas,
            data,
        ])
        ctx.op.callData = newCallData
    }
}
