import { waitForTransactionReceipt } from '@wagmi/core'
import { Hex } from 'viem'
import { wagmiConfig } from 'wagmiConfig'

export async function waitForReceipt(args: { hash: Hex }) {
    const { hash } = args
    return waitForTransactionReceipt(wagmiConfig, { hash })
}
