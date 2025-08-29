import { Permission } from '@towns-protocol/web3'
import { eq } from 'ponder'
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

export async function updateSpaceSwapVolume(
    context: Context,
    spaceId: `0x${string}`,
    blockTimestamp: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: bigint,
    amountOut: bigint,
): Promise<void> {
    const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

    // Calculate ETH volume: use amountIn if tokenIn is ETH, amountOut if tokenOut is ETH
    let ethVolume = 0n
    if (tokenIn.toLowerCase() === ETH_ADDRESS) {
        ethVolume = amountIn
    } else if (tokenOut.toLowerCase() === ETH_ADDRESS) {
        ethVolume = amountOut
    }

    // If no ETH involved, skip volume tracking
    if (ethVolume === 0n) {
        console.log(`Skipping volume update for space ${spaceId} - no ETH in swap`)
        return
    }

    const timestamp = Number(blockTimestamp)
    const dayIndex = Math.floor(timestamp / 86400)
    const dayId = `${spaceId}-${dayIndex}`

    // Update daily volume
    const existingDaily = await context.db.sql.query.spaceDailySwapVolume.findFirst({
        where: eq(schema.spaceDailySwapVolume.id, dayId),
    })

    if (existingDaily) {
        await context.db.sql
            .update(schema.spaceDailySwapVolume)
            .set({ volume: (existingDaily.volume ?? 0n) + ethVolume })
            .where(eq(schema.spaceDailySwapVolume.id, dayId))
    } else {
        await context.db.insert(schema.spaceDailySwapVolume).values({
            id: dayId,
            spaceId,
            day: dayIndex,
            volume: ethVolume,
        })
    }

    // Get current space to increment all-time volume
    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
    })

    const currentAllTimeVolume = space?.swapVolumeAllTime ?? 0n

    // Calculate 7d rolling volume (last 7 days)
    const cutoff7d = dayIndex - 7
    const daily7dRecords = await context.db.sql.query.spaceDailySwapVolume.findMany({
        where: (t, { and, eq: eqOp, gte }) => and(eqOp(t.spaceId, spaceId), gte(t.day, cutoff7d)),
    })
    const swapVolumeLast7d = daily7dRecords.reduce((sum, record) => sum + (record.volume ?? 0n), 0n)

    // Calculate 30d rolling volume (last 30 days)
    const cutoff30d = dayIndex - 30
    const daily30dRecords = await context.db.sql.query.spaceDailySwapVolume.findMany({
        where: (t, { and, eq: eqOp, gte }) => and(eqOp(t.spaceId, spaceId), gte(t.day, cutoff30d)),
    })
    const swapVolumeLast30d = daily30dRecords.reduce(
        (sum, record) => sum + (record.volume ?? 0n),
        0n,
    )

    // Update space with all new volumes
    await context.db.sql
        .update(schema.space)
        .set({
            swapVolumeLast7d,
            swapVolumeLast30d,
            swapVolumeAllTime: currentAllTimeVolume + ethVolume,
        })
        .where(eq(schema.space.id, spaceId))

    console.log(
        `Updated space ${spaceId} swap volume - ETH amount: ${ethVolume}, 7d: ${swapVolumeLast7d}, 30d: ${swapVolumeLast30d}, all-time: ${currentAllTimeVolume + ethVolume}`,
    )
}

export { publicClient, getLatestBlockNumber, getCreatedDate }
