import { MAX_MULTIPLIER } from '../../../constants'
import { ethersOpDetailsToViemOpDetails, selectUserOpsByAddress } from '../../../store/userOpsStore'
import { bigIntMax, bigIntMultiply } from '../../../utils/bigInt'
import { getGasFees } from './getGasFees'
import { Client } from 'viem'

export async function estimateGasFeesWithReplacement(args: { sender: string; client: Client }) {
    const _uoToDropEthers = selectUserOpsByAddress(args.sender).pending
    const uoToDrop = {
        op: ethersOpDetailsToViemOpDetails(_uoToDropEthers),
    }

    if (!uoToDrop.op) {
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
    return result
}
