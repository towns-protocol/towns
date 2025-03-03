import { Client } from 'viem'
import { Hex, hexToBigInt } from 'viem'
import { getBlock } from 'viem/actions'

export async function getGasFees(args: { client: Client }) {
    const { client } = args
    // https://docs.alchemy.com/reference/bundler-api-fee-logic
    const getFee = async (method: 'rundler_maxPriorityFeePerGas' | 'eth_maxPriorityFeePerGas') =>
        // @ts-expect-error rundler_maxPriorityFeePerGas is not viem
        await Promise.all([client.request({ method }, { retryCount: 0 }), getBlock(client)])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fee: any
    let block: Awaited<ReturnType<typeof getBlock>>
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, no-extra-semi
        ;[fee, block] = await getFee('rundler_maxPriorityFeePerGas')
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, no-extra-semi
        ;[fee, block] = await getFee('eth_maxPriorityFeePerGas')
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tip: bigint = hexToBigInt(fee as Hex)
    const maxPriorityFeePerGasBuffer = (tip / 100n) * 25n
    const maxPriorityFeePerGas = tip + maxPriorityFeePerGasBuffer
    const maxFeePerGas = block.baseFeePerGas
        ? block.baseFeePerGas * 2n + maxPriorityFeePerGas
        : maxPriorityFeePerGas

    return { maxFeePerGas, maxPriorityFeePerGas }
}
