import { BundlerJsonRpcProvider, IUserOperationMiddlewareCtx } from 'userop'
import { BigNumber } from 'ethers'
import { getGasPrice as getEthMaxPriorityFeePerGas } from 'userop/dist/preset/middleware'
import { selectUserOpsByAddress } from '../../../store/userOpsStore'
import { getGasFees } from './getGasFees'
import { bigIntMax, bigIntMultiply } from '../../../utils/bigInt'
import { MAX_MULTIPLIER } from '../../../constants'

// calculate maxFeePerGas and maxPriorityFeePerGas
// TODO: RENAME
export async function estimateGasFeesMiddleware(
    ctx: IUserOperationMiddlewareCtx,
    provider: BundlerJsonRpcProvider,
) {
    try {
        const { maxFeePerGas, maxPriorityFeePerGas } = await estimateGasFeesWithReplacement({
            sender: ctx.op.sender,
            provider,
        })
        ctx.op.maxFeePerGas = maxFeePerGas
        ctx.op.maxPriorityFeePerGas = maxPriorityFeePerGas
    } catch (error) {
        // fallback to using eth_getMaxPriorityFeePerGas
        await getEthMaxPriorityFeePerGas(provider)(ctx)
    }
}

export async function estimateGasFeesWithReplacement(args: {
    sender: string
    provider: BundlerJsonRpcProvider
}) {
    const uoToDrop = selectUserOpsByAddress(args.sender).pending

    if (!uoToDrop.op) {
        return getGasFees({ provider: args.provider })
    }

    const { maxFeePerGas, maxPriorityFeePerGas } = await getGasFees({
        provider: args.provider,
    })

    const result = {
        maxFeePerGas: bigIntMax(
            maxFeePerGas.toBigInt() ?? 0n,
            bigIntMultiply(BigNumber.from(uoToDrop.op.maxFeePerGas).toBigInt(), MAX_MULTIPLIER),
        ),
        maxPriorityFeePerGas: bigIntMax(
            maxPriorityFeePerGas.toBigInt() ?? 0n,
            bigIntMultiply(
                BigNumber.from(uoToDrop.op.maxPriorityFeePerGas).toBigInt(),
                MAX_MULTIPLIER,
            ),
        ),
    }
    return result
}
