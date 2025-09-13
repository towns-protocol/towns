import { Permission } from '@towns-protocol/web3'
import { eq } from 'ponder'
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

/**
 * Returns a block number suitable for reading the SpaceOwner contract.
 * The SpaceOwner contract was upgraded at different blocks on different environments,
 * so we need to ensure we're reading from a block where the new ABI is valid.
 *
 * Note: Ponder caches RPC requests based on block number, so using a consistent
 * block number for contract reads helps maximize cache efficiency.
 */
async function getReadSpaceInfoBlockNumber(blockNumber: bigint): Promise<bigint> {
    const environment = process.env.PONDER_ENVIRONMENT || 'local_dev'

    // For local dev, use the latest block number
    if (environment === 'local_dev') {
        return await publicClient.getBlockNumber()
    }

    // Environment-specific minimum block numbers where the upgraded contract is available
    const minBlockByEnvironment: Record<string, bigint> = {
        alpha: 30861709n, // Sep 10, 2025
        gamma: 30861709n, // Sep 10, 2025
        omega: 35350928n, // Sep 10, 2025
    }

    const minBlock = minBlockByEnvironment[environment] ?? 0n
    return blockNumber > minBlock ? blockNumber : minBlock
}

export { getReadSpaceInfoBlockNumber, getCreatedDate }
