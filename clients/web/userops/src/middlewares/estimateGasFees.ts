import { BundlerJsonRpcProvider, IUserOperationMiddlewareCtx } from 'userop'
import { BigNumber, BigNumberish } from 'ethers'
import { getGasPrice as getEthMaxPriorityFeePerGas } from 'userop/dist/preset/middleware'
import { selectUserOpsByAddress } from '../store/userOpsStore'
import { getGasFees } from './getGasFees'

// don't go below 1.1x, userop requires an increase of at least 10% of gas fees for replacement
export const MAX_MULTIPLIER = 1.3

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
            bigIntMultiply(uoToDrop.op.maxFeePerGas, MAX_MULTIPLIER),
        ),
        maxPriorityFeePerGas: bigIntMax(
            maxPriorityFeePerGas.toBigInt() ?? 0n,
            bigIntMultiply(uoToDrop.op.maxPriorityFeePerGas, MAX_MULTIPLIER),
        ),
    }
    return result
}

export const bigIntMax = (...args: bigint[]): bigint => {
    if (!args.length) {
        throw new Error('bigIntMax requires at least one argument')
    }

    return args.reduce((m, c) => (m > c ? m : c))
}

export const bigIntMultiply = (base: BigNumberish, multiplier: number) => {
    // Get decimal places of b. Max decimal places is defined by the MultiplerSchema.
    const decimalPlaces = multiplier.toString().split('.')[1]?.length ?? 0
    const val =
        BigNumber.from(base).toBigInt() * BigInt(multiplier * 10 ** decimalPlaces) +
        BigInt(10 ** decimalPlaces - 1)

    return val / BigInt(10 ** decimalPlaces)
}
