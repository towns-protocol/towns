import { MAX_MULTIPLIER } from '../../../constants'
import { selectUserOpsByAddress } from '../../../store/userOpsStore'
import { bigIntMax, bigIntMultiply } from '../../../utils/bigInt'
import { Client, Hex, hexToBigInt } from 'viem'
import { getBlock } from 'viem/actions'

export async function estimateGasFeesWithReplacement(args: { sender: string; client: Client }) {
    const uoToDrop = selectUserOpsByAddress(args.sender).pending

    if (!uoToDrop.op) {
        console.log(`[UserOperations] No user operation to drop, estimating gas fees...`)
        return getGasFees({ client: args.client })
    }

    const { maxFeePerGas, maxPriorityFeePerGas } = await getGasFees({
        client: args.client,
    })

    const result = {
        maxFeePerGas: bigIntMax(
            maxFeePerGas ?? 0n,
            bigIntMultiply(uoToDrop.op.maxFeePerGas, MAX_MULTIPLIER),
        ),
        maxPriorityFeePerGas: bigIntMax(
            maxPriorityFeePerGas ?? 0n,
            bigIntMultiply(uoToDrop.op.maxPriorityFeePerGas, MAX_MULTIPLIER),
        ),
    }
    console.log(`[UserOperations] Found op to drop, estimated gas fees:`, {
        uoToDropMaxFeePerGas: uoToDrop.op.maxFeePerGas,
        uoToDropMaxPriorityFeePerGas: uoToDrop.op.maxPriorityFeePerGas,
        replacementMaxFeePerGas: result.maxFeePerGas,
        replacementMaxPriorityFeePerGas: result.maxPriorityFeePerGas,
    })
    return result
}

async function getGasFees(args: { client: Client }) {
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
