import { createClient, http, parseAbiItem, Address } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { getLogs } from 'viem/actions'
import { Environment } from 'worker-common'

// 24707541 -> first tip on base
// 19909596 -> first tip on base sepolia
export const FIRST_TIP_BLOCK: Record<Environment, bigint> = {
    omega: 24707541n,
    alpha: 19909596n,
    'test-beta': 19909596n,
    development: 19909596n,
    delta: 19909596n,
    test: 19909596n,
}

const tipEventAbi = parseAbiItem(
    'event Tip(uint256 indexed tokenId, address indexed currency, address sender, address receiver, uint256 amount, bytes32 messageId, bytes32 channelId)',
)

export async function getTipLeaderboard(
    spaceAddress: Address,
    rpcUrl: string,
    environment: Environment,
) {
    const client = createClient({
        chain: environment === 'omega' ? base : baseSepolia,
        transport: http(rpcUrl),
    })
    const logs = await getLogs(client, {
        event: tipEventAbi,
        fromBlock: FIRST_TIP_BLOCK[environment] || 0n,
        toBlock: 'latest',
        address: spaceAddress,
    })

    const tipTotals: Record<string, bigint> = {}
    for (const log of logs) {
        if (!log.args?.sender || !log.args?.amount) continue

        const sender = log.args.sender
        const amount = log.args.amount

        if (!tipTotals[sender]) {
            tipTotals[sender] = 0n
        }
        tipTotals[sender] += amount
    }
    const leaderboard = Object.entries(tipTotals)
        .sort(([, a], [, b]) => Number(b - a))
        .slice(0, 100)
        .map(([sender, amount]) => ({
            sender,
            amount: amount.toString(),
        }))

    return leaderboard
}
