import { Permission } from '@towns-protocol/web3'
import { eq, and, gte } from 'ponder'
import { Context } from 'ponder:registry'
import schema from 'ponder:schema'
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

export async function updateSpaceTotalStaked(
    context: Context,
    spaceId: `0x${string}`,
    amountDelta: bigint,
): Promise<void> {
    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
    })
    if (space) {
        const newTotal = (space.totalAmountStaked ?? 0n) + amountDelta
        await context.db.sql
            .update(schema.space)
            .set({
                totalAmountStaked: newTotal >= 0n ? newTotal : 0n,
            })
            .where(eq(schema.space.id, spaceId))

        console.log(
            `Updated space ${spaceId} totalAmountStaked: ${space.totalAmountStaked} -> ${newTotal}`,
        )
    }
}

export async function handleStakeToSpace(
    context: Context,
    delegatee: `0x${string}` | null,
    amount: bigint,
): Promise<void> {
    if (!delegatee) return

    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, delegatee),
    })
    if (space) {
        await updateSpaceTotalStaked(context, delegatee, amount)
    }
}

export async function handleRedelegation(
    context: Context,
    oldDelegatee: `0x${string}` | null,
    newDelegatee: `0x${string}` | null,
    amount: bigint,
): Promise<void> {
    try {
        if (oldDelegatee) {
            await handleStakeToSpace(context, oldDelegatee, 0n - amount)
        }
        if (newDelegatee) {
            await handleStakeToSpace(context, newDelegatee, amount)
        }
    } catch (error) {
        console.error(`Error handling redelegation:`, error)
    }
}

export function decodePermissions(permissions: readonly string[]): Permission[] {
    const decodedPermissions: Permission[] = []
    for (const perm of permissions) {
        try {
            const decoded = Buffer.from(perm.slice(2), 'hex')
                .toString('utf8')
                .replace(/\0/g, '')
                .trim() as Permission

            if (decoded && Object.values(Permission).includes(decoded)) {
                decodedPermissions.push(decoded)
            }
        } catch (error) {
            console.warn(`Failed to parse permission: ${perm}`, error)
        }
    }
    return decodedPermissions
}

export async function updateSpaceCachedMetrics(
    context: Context,
    spaceId: `0x${string}`,
    blockTimestamp: bigint,
    ethAmount: bigint,
    eventType: 'swap' | 'tip',
): Promise<void> {
    // Skip if no ETH value
    if (ethAmount === 0n) {
        return
    }

    const currentTimestamp = Number(blockTimestamp)
    const sevenDaysAgo = currentTimestamp - (7 * 86400)
    const thirtyDaysAgo = currentTimestamp - (30 * 86400)

    // Get current space for all-time volume
    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
    })

    if (!space) {
        console.warn(`Space ${spaceId} not found`)
        return
    }

    // Query raw events for rolling windows from denormalized table
    const recentEvents = await context.db.sql.query.analyticsEvent.findMany({
        where: and(
            eq(schema.analyticsEvent.spaceId, spaceId),
            gte(schema.analyticsEvent.blockTimestamp, BigInt(thirtyDaysAgo))
        ),
    })

    // Calculate volumes based on event type
    let swapVolume7d = 0n
    let swapVolume30d = 0n
    let tipVolume7d = 0n
    let tipVolume30d = 0n

    for (const event of recentEvents) {
        const eventTimestamp = Number(event.blockTimestamp)
        const eventEthAmount = event.ethAmount || 0n
        
        if (event.eventType === 'swap') {
            if (eventTimestamp >= sevenDaysAgo) {
                swapVolume7d += eventEthAmount
            }
            swapVolume30d += eventEthAmount
        } else if (event.eventType === 'tip') {
            if (eventTimestamp >= sevenDaysAgo) {
                tipVolume7d += eventEthAmount
            }
            tipVolume30d += eventEthAmount
        }
    }

    // Update cached metrics on space
    type SwapMetrics = {
        swapVolumeLast7d: bigint
        swapVolumeLast30d: bigint
        swapVolumeAllTime: bigint
    }
    
    type TipMetrics = {
        tipVolumeLast7d: bigint
        tipVolumeLast30d: bigint
        tipVolumeAllTime: bigint
    }
    
    type MetricUpdate = SwapMetrics | TipMetrics
    
    let updates: MetricUpdate
    
    if (eventType === 'swap') {
        updates = {
            swapVolumeLast7d: swapVolume7d,
            swapVolumeLast30d: swapVolume30d,
            swapVolumeAllTime: (space.swapVolumeAllTime || 0n) + ethAmount,
        }
    } else if (eventType === 'tip') {
        updates = {
            tipVolumeLast7d: tipVolume7d,
            tipVolumeLast30d: tipVolume30d,
            tipVolumeAllTime: (space.tipVolumeAllTime || 0n) + ethAmount,
        }
    } else {
        console.warn(`Unknown event type: ${eventType} for space ${spaceId}`)
        return
    }

    await context.db.sql
        .update(schema.space)
        .set(updates)
        .where(eq(schema.space.id, spaceId))

    console.log(`Updated cached metrics for space ${spaceId} - type: ${eventType}, amount: ${ethAmount}`)
}

export { publicClient, getLatestBlockNumber, getCreatedDate }
