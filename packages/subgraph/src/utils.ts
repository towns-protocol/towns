import { Permission } from '@towns-protocol/web3'
import { eq, and, gte } from 'ponder'
import { Context } from 'ponder:registry'
import schema from 'ponder:schema'
import { createPublicClient, http } from 'viem'

const publicClient = createPublicClient({
    transport: http(process.env.PONDER_RPC_URL_1),
})

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
    eventType: 'swap' | 'tip' | 'join',
): Promise<void> {
    // Get current timestamp for rolling window calculations
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const oneDayAgo = currentTimestamp - 86400
    const sevenDaysAgo = currentTimestamp - 7 * 86400
    const thirtyDaysAgo = currentTimestamp - 30 * 86400

    // Get current space
    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
    })

    if (!space) {
        console.warn(`Space ${spaceId} not found`)
        return
    }

    // Query only events from the last 30 days for the specific type
    const filteredEvents = await context.db.sql.query.analyticsEvent.findMany({
        where: and(
            eq(schema.analyticsEvent.spaceId, spaceId),
            eq(schema.analyticsEvent.eventType, eventType),
            gte(schema.analyticsEvent.blockTimestamp, BigInt(thirtyDaysAgo)),
        ),
    })

    // Initialize update object with existing space values
    type SwapMetrics = {
        swapVolume24h: bigint
        swapVolume7d: bigint
        swapVolume30d: bigint
    }

    type TipMetrics = {
        tipVolume24h: bigint
        tipVolume7d: bigint
        tipVolume30d: bigint
    }

    type JoinMetrics = {
        joinVolume24h: bigint
        joinVolume7d: bigint
        joinVolume30d: bigint
        memberCount24h: bigint
        memberCount7d: bigint
        memberCount30d: bigint
    }

    let updates: SwapMetrics | TipMetrics | JoinMetrics

    if (eventType === 'swap') {
        // Calculate swap metrics for rolling windows
        let swapVolume24h = 0n
        let swapVolume7d = 0n
        let swapVolume30d = 0n

        for (const event of filteredEvents) {
            const eventTimestamp = Number(event.blockTimestamp)
            const eventEthAmount = event.ethAmount || 0n

            // All events are already within 30 days due to filtering
            swapVolume30d += eventEthAmount

            if (eventTimestamp >= oneDayAgo) {
                swapVolume24h += eventEthAmount
            }
            if (eventTimestamp >= sevenDaysAgo) {
                swapVolume7d += eventEthAmount
            }
        }

        updates = {
            swapVolume24h,
            swapVolume7d,
            swapVolume30d,
        }
    } else if (eventType === 'tip') {
        // Calculate tip metrics for rolling windows
        let tipVolume24h = 0n
        let tipVolume7d = 0n
        let tipVolume30d = 0n

        for (const event of filteredEvents) {
            const eventTimestamp = Number(event.blockTimestamp)
            const eventEthAmount = event.ethAmount || 0n

            // All events are already within 30 days due to filtering
            tipVolume30d += eventEthAmount

            if (eventTimestamp >= oneDayAgo) {
                tipVolume24h += eventEthAmount
            }
            if (eventTimestamp >= sevenDaysAgo) {
                tipVolume7d += eventEthAmount
            }
        }

        updates = {
            tipVolume24h,
            tipVolume7d,
            tipVolume30d,
        }
    } else if (eventType === 'join') {
        // Calculate join metrics for rolling windows
        let joinVolume24h = 0n
        let joinVolume7d = 0n
        let joinVolume30d = 0n
        let memberCount24h = 0n
        let memberCount7d = 0n
        let memberCount30d = 0n

        for (const event of filteredEvents) {
            const eventTimestamp = Number(event.blockTimestamp)
            const eventEthAmount = event.ethAmount || 0n

            // All events are already within 30 days due to filtering
            memberCount30d += 1n
            joinVolume30d += eventEthAmount

            if (eventTimestamp >= oneDayAgo) {
                memberCount24h += 1n
                joinVolume24h += eventEthAmount
            }
            if (eventTimestamp >= sevenDaysAgo) {
                memberCount7d += 1n
                joinVolume7d += eventEthAmount
            }
        }

        updates = {
            joinVolume24h,
            joinVolume7d,
            joinVolume30d,
            memberCount24h,
            memberCount7d,
            memberCount30d,
        }
    } else {
        // This should never happen due to the type constraint, but TypeScript needs it
        console.error(`Unknown event type: ${eventType}`)
        return
    }

    await context.db.sql.update(schema.space).set(updates).where(eq(schema.space.id, spaceId))

    console.log(`Updated ${eventType} rolling window metrics for space ${spaceId}`)
}

export function calculateWeightedRating(averageRating: number, reviewCount: number): number {
    // Bayesian average formula: pulls rating toward global average when few reviews exist
    // This prevents spaces with 1-2 five-star reviews from ranking highest
    const globalAverage = 3.0 // Middle rating on 1-5 scale
    const minReviews = 10 // Threshold for confidence

    const weightedRating =
        (reviewCount * averageRating + minReviews * globalAverage) / (reviewCount + minReviews)

    return weightedRating
}

export async function updateSpaceReviewMetrics(
    context: Context,
    spaceId: `0x${string}`,
): Promise<void> {
    try {
        // Get all reviews for the space
        const allReviews = await context.db.sql.query.review.findMany({
            where: eq(schema.review.spaceId, spaceId),
        })

        // Calculate total and average
        let totalRating = 0
        for (const review of allReviews) {
            totalRating += review.rating
        }

        const reviewCount = BigInt(allReviews.length)
        const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0

        // Calculate weighted rating using Bayesian average
        const weightedRating = calculateWeightedRating(averageRating, allReviews.length)

        // Update space with calculated metrics
        await context.db.sql
            .update(schema.space)
            .set({
                reviewCount: reviewCount,
                averageRating: averageRating,
                weightedRating: weightedRating,
            })
            .where(eq(schema.space.id, spaceId))

        console.log(
            `Updated review metrics for space ${spaceId}: count=${reviewCount}, average=${averageRating.toFixed(2)}, weighted=${weightedRating.toFixed(2)}`,
        )
    } catch (error) {
        console.error(`Error updating review metrics for space ${spaceId}:`, error)
    }
}

// Cache for recent block number with TTL
let cachedBlockNumber: { value: bigint; timestamp: number } | null = null
const BLOCK_CACHE_TTL_MS = 30 * 60 * 1000 // Cache for 30 minutes

/**
 * Gets a recent block number, cached for 30 minutes to avoid redundant RPC calls.
 * This works because we're using it for the upgraded SpaceOwner contract which
 * needs a relatively recent block where the new ABI is valid.
 */
async function getRecentBlockNumber(): Promise<bigint> {
    return 35350928n
    // const now = Date.now()
    
    // // Return cached value if still valid
    // if (cachedBlockNumber && (now - cachedBlockNumber.timestamp) < BLOCK_CACHE_TTL_MS) {
    //     return cachedBlockNumber.value
    // }
    
    // // Fetch new block number and cache it
    // const blockNumber = await publicClient.getBlockNumber()
    // cachedBlockNumber = { value: blockNumber, timestamp: now }
    // return blockNumber
}

export { publicClient, getRecentBlockNumber, getCreatedDate }
