import { createClient, http, parseAbiItem, Log, Address } from 'viem'
import { base } from 'viem/chains'
import { getLogs } from 'viem/actions'

const FIRST_TIP_BLOCK = 24707541n

const tipEventAbi = parseAbiItem(
    'event Tip(uint256 indexed tokenId, address indexed currency, address sender, address receiver, uint256 amount, bytes32 messageId, bytes32 channelId)',
)

export async function getTipLeaderboard(spaceAddress: Address, rpcUrl: string) {
    const client = createClient({
        chain: base,
        transport: http(rpcUrl),
    })
    const logs = await getLogs(client, {
        event: tipEventAbi,
        fromBlock: FIRST_TIP_BLOCK,
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
