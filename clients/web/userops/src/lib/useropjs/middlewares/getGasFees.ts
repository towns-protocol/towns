import { BundlerJsonRpcProvider } from 'userop'
import { BigNumber } from 'ethers'

export async function getGasFees({ provider }: { provider: BundlerJsonRpcProvider }) {
    // https://docs.alchemy.com/reference/bundler-api-fee-logic
    const getFee = async (method: 'rundler_maxPriorityFeePerGas' | 'eth_maxPriorityFeePerGas') =>
        await Promise.all([provider.send(method, []), provider.getBlock('latest')])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fee: any
    let block: Awaited<ReturnType<typeof provider.getBlock>>
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, no-extra-semi
        ;[fee, block] = await getFee('rundler_maxPriorityFeePerGas')
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, no-extra-semi
        ;[fee, block] = await getFee('eth_maxPriorityFeePerGas')
    }

    const tip = BigNumber.from(fee)
    const maxPriorityFeePerGasBuffer = tip.div(100).mul(25)
    const maxPriorityFeePerGas = tip.add(maxPriorityFeePerGasBuffer)
    const maxFeePerGas = block.baseFeePerGas
        ? block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas)
        : maxPriorityFeePerGas

    return { maxFeePerGas, maxPriorityFeePerGas }
}
