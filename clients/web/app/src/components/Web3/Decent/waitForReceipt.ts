import { waitForTransactionReceipt } from '@wagmi/core'
import { Hex } from 'viem'
import { wagmiConfig } from 'wagmiConfig'

export async function waitForReceipt(args: { hash: Hex; chainId?: number }) {
    const { hash, chainId } = args
    return waitForTransactionReceipt(wagmiConfig, { hash, chainId })
}
