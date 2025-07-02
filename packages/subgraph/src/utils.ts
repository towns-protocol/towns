import { createPublicClient, http } from 'viem'

const publicClient = createPublicClient({
    transport: http(process.env.PONDER_RPC_URL_1),
})

async function getLatestBlockNumber() {
    return await publicClient.getBlockNumber()
}

function getCreatedDate(blockTimestamp: bigint): Date | null {
    // 1970-01-01T00:00:00Z in ms
    const MIN_PG_TIMESTAMP_MS = -62135596800000
    // 2100-01-01T00:00:00Z in ms
    const MAX_PG_TIMESTAMP_MS = 4102444800000
    let timestamp: number | null = null
    try {
        timestamp = parseInt(blockTimestamp.toString(), 10) * 1000
    } catch (error) {
        console.warn(`Invalid blockTimestamp: ${blockTimestamp}`)
        return null
    }
    if (timestamp < MIN_PG_TIMESTAMP_MS || timestamp > MAX_PG_TIMESTAMP_MS) {
        console.warn(`Invalid range for blockTimestamp: ${blockTimestamp}`)
        return null
    }
    return new Date(timestamp)
}

export { publicClient, getLatestBlockNumber, getCreatedDate }
