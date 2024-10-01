import { BundlerJsonRpcProvider, IUserOperationMiddlewareCtx } from 'userop'
import { BigNumber } from 'ethers'
import { getGasPrice as getEthMaxPriorityFeePerGas } from 'userop/dist/preset/middleware'

// calculate maxFeePerGas and maxPriorityFeePerGas
export async function estimateAlchemyGasFees(
    ctx: IUserOperationMiddlewareCtx,
    provider: BundlerJsonRpcProvider,
) {
    if (ctx.op.paymasterAndData !== '0x') {
        return
    }

    try {
        // https://docs.alchemy.com/reference/bundler-api-fee-logic
        const [fee, block] = await Promise.all([
            provider.send('rundler_maxPriorityFeePerGas', []),
            provider.getBlock('latest'),
        ])

        const tip = BigNumber.from(fee)
        const maxPriorityFeePerGasBuffer = tip.div(100).mul(25)
        const maxPriorityFeePerGas = tip.add(maxPriorityFeePerGasBuffer)
        const maxFeePerGas = block.baseFeePerGas
            ? block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas)
            : maxPriorityFeePerGas

        ctx.op.maxFeePerGas = maxFeePerGas
        ctx.op.maxPriorityFeePerGas = maxPriorityFeePerGas
    } catch (error) {
        // fallback to using eth_getMaxPriorityFeePerGas
        await getEthMaxPriorityFeePerGas(provider)(ctx)
    }
}
