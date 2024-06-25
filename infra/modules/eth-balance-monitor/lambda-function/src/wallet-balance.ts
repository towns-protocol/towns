import { NodeStructOutput } from '@river-build/generated/v3/typings/INodeRegistry'
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
    console.log(`Getting balance for wallet ${node.nodeAddress}`)
    const balanceBigInt = await provider.getBalance(node.nodeAddress)
    const balanceNum = Number(balanceBigInt)
    const balance = balanceNum / 10 ** 18

    console.log(`Got balance for wallet ${node.nodeAddress}: ${balance}`)

    return { node, balance, chain }
}

export async function getWalletBalances(
    provider: ethers.providers.Provider,
    nodes: NodeStructOutput[],
    chain: string,
): Promise<RiverNodeWalletBalance[]> {
    const walletBalancePromises = nodes.map((node) => getWalletBalance(provider, node, chain))
    const walletBalances = await Promise.all(walletBalancePromises)

    console.log(`Getting wallet balances for: ${chain}`)

    return walletBalances
}
