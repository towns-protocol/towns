import { Permission } from '@towns-protocol/web3'
import { Context } from 'ponder:registry'
import schema from 'ponder:schema'
import { createPublicClient, http } from 'viem'

// Currency address constants
export const USDC_ADDRESSES = {
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const

export const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as const
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

// Mainnet environments use Base mainnet USDC, others use Base Sepolia USDC
// Note: Only omega is fully configured. Add other environments here when their
// config files, block number mappings, and app registry support are added.
const MAINNET_ENVIRONMENTS = ['omega']

/**
 * Determines if a currency address is USDC based on environment.
 * @param currency - The currency address to check
 * @param environment - The deployment environment (alpha, beta, omega, local_dev)
 * @returns true if the currency is USDC
 */
export function isUSDC(currency: string | undefined | null, environment: string): boolean {
    if (!currency) return false
    const normalizedCurrency = currency.toLowerCase()
    const isMainnet = MAINNET_ENVIRONMENTS.includes(environment)
    const usdcAddress = isMainnet
        ? USDC_ADDRESSES.base.toLowerCase()
        : USDC_ADDRESSES.baseSepolia.toLowerCase()
    return normalizedCurrency === usdcAddress
}

/**
 * Determines if a currency address is ETH.
 * Defaults to ETH if currency is empty, null, undefined, or zero address.
 * @param currency - The currency address to check
 * @returns true if the currency is ETH (or should default to ETH)
 */
export function isETH(currency: string | undefined | null): boolean {
    if (!currency) return true // Default to ETH if empty/null/undefined
    const normalizedCurrency = currency.toLowerCase()
    return (
        normalizedCurrency === ETH_ADDRESS.toLowerCase() ||
        normalizedCurrency === ZERO_ADDRESS.toLowerCase()
    )
}

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

/**
 * Fetches the membership currency for a space with caching.
 * Returns cached currency from Space entity if available, otherwise fetches via RPC.
 * On RPC failure, returns null (caller should skip the record).
 * @param context - Ponder context with db, client, and contracts
 * @param spaceId - The space address
 * @param blockNumber - Block number for the RPC call
 * @returns The currency address, or null if fetch failed
 */
export async function getSpaceCurrency(
    context: Context,
    spaceId: `0x${string}`,
    blockNumber: bigint,
): Promise<`0x${string}` | null> {
    try {
        // Check DB cache first
        const space = await context.db.find(schema.space, { id: spaceId })

        // If space has currency cached, use it
        if (space?.currency) {
            return space.currency as `0x${string}`
        }

        // Cache miss - fetch via RPC (Ponder handles retries)
        const { Space } = context.contracts
        const currency = await context.client.readContract({
            address: spaceId,
            abi: Space.abi,
            functionName: 'getMembershipCurrency',
            blockNumber,
        })

        // Normalize zero address to ETH
        const normalizedCurrency = currency === ZERO_ADDRESS ? ETH_ADDRESS : currency

        // Update cache (fire and forget)
        context.db
            .update(schema.space, { id: spaceId })
            .set({ currency: normalizedCurrency })
            .catch((err) => console.warn(`Failed to cache currency for ${spaceId}:`, err))

        return normalizedCurrency as `0x${string}`
    } catch (error) {
        console.error(
            `RPC currency fetch failed for space ${spaceId} at block ${blockNumber}:`,
            error,
        )
        // TODO: Emit metric rpc_currency_fetch_failures_total via ponder metrics
        return null
    }
}

export async function updateSpaceTotalStaked(
    context: Context,
    spaceId: `0x${string}`,
    amountDelta: bigint,
): Promise<void> {
    const space = await context.db.find(schema.space, { id: spaceId })
    if (space) {
        const newTotal = (space.totalAmountStaked ?? 0n) + amountDelta
        await context.db.update(schema.space, { id: spaceId }).set({
            totalAmountStaked: newTotal >= 0n ? newTotal : 0n,
        })

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

    const space = await context.db.find(schema.space, { id: delegatee })
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
        beta: 30861709n, // Oct 02, 2025
        omega: 35350928n, // Sep 10, 2025
    }

    const minBlock = minBlockByEnvironment[environment] ?? 0n
    return blockNumber > minBlock ? blockNumber : minBlock
}

export { getReadSpaceInfoBlockNumber, getCreatedDate }
