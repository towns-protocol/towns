import { NodeStructOutput } from '@river-build/generated/dev/typings/INodeRegistry'
import { ethers } from 'ethers'

export interface RiverNodeWalletBalance {
    node: NodeStructOutput
    balance: number
    chain: string
}

export async function getWalletBalance(
    provider: ethers.providers.Provider,
    node: NodeStructOutput,
    chain: string,
): Promise<RiverNodeWalletBalance> {
    const balanceBigInt = await provider.getBalance(node.nodeAddress)
    const balanceNum = Number(balanceBigInt)
    const balance = balanceNum / 10 ** 18

    return { node, balance, chain }
}

export async function getWalletBalances(
    provider: ethers.providers.Provider,
    nodes: NodeStructOutput[],
    chain: string,
): Promise<RiverNodeWalletBalance[]> {
    console.log(`Getting wallet balances for: ${chain}`)
    const walletBalancePromises = nodes.map((node) => getWalletBalance(provider, node, chain))
    const walletBalances = await Promise.all(walletBalancePromises)
    console.log(`Got wallet balances for: ${chain}`)

    return walletBalances
}
