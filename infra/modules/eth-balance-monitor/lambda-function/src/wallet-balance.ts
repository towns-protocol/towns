import { PublicClient } from 'viem'
import { RiverNode } from './river-node'

export interface RiverNodeWalletBalance {
    node: RiverNode
    balance: number
    chain: string
}

export async function getWalletBalance(
    client: PublicClient,
    node: RiverNode,
    chain: string,
): Promise<RiverNodeWalletBalance> {
    console.log(`Getting balance for wallet ${node.nodeAddress}`)
    const balanceBigInt = await client.getBalance({
        address: node.nodeAddress,
        blockTag: 'latest',
    })
    const balanceNum = Number(balanceBigInt)
    const balance = balanceNum / 10 ** 18

    console.log(`Got balance for wallet ${node.nodeAddress}: ${balance}`)

    return { node, balance, chain }
}

export async function getWalletBalances(
    client: PublicClient,
    nodes: readonly RiverNode[],
    chain: string,
): Promise<RiverNodeWalletBalance[]> {
    const walletBalancePromises = nodes.map((node) => getWalletBalance(client, node, chain))
    const walletBalances = await Promise.all(walletBalancePromises)

    console.log(`Getting wallet balances for: ${chain}`)

    return walletBalances
}
