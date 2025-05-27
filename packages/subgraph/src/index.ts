import { eq } from 'ponder'
import { ponder } from 'ponder:registry'
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

ponder.on('SpaceFactory:SpaceCreated', async ({ event, context }) => {
    // Get latest block number
    const blockNumber = await getLatestBlockNumber()
    const { SpaceFactory, SpaceOwner } = context.contracts

    // Check if the space already exists
    const existingSpace = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, event.args.space),
    })
    if (existingSpace) {
        console.warn(`Space already exists for SpaceFactory:SpaceCreated`, event.args.space)
        return
    }

    try {
        const paused = await context.client.readContract({
            abi: SpaceFactory.abi,
            address: event.args.space,
            functionName: 'paused',
            args: [],
            blockNumber, // Use the latest block number
        })

        const space = await context.client.readContract({
            abi: SpaceOwner.abi,
            address: SpaceOwner.address,
            functionName: 'getSpaceInfo',
            args: [event.args.space],
            blockNumber, // Use the latest block number
        })

        await context.db.insert(schema.space).values({
            id: event.args.space,
            owner: event.args.owner,
            tokenId: event.args.tokenId,
            name: space.name,
            uri: space.uri,
            shortDescription: space.shortDescription,
            longDescription: space.longDescription,
            createdAt: space.createdAt,
            paused: paused,
        })
    } catch (error) {
        console.error(
            `Error processing SpaceFactory:SpaceCreated at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('SpaceOwner:SpaceOwner__UpdateSpace', async ({ event, context }) => {
    // Get latest block number
    const blockNumber = await getLatestBlockNumber()
    const { SpaceFactory, SpaceOwner } = context.contracts

    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, event.args.space),
    })
    if (!space) {
        console.warn(`Space not found for SpaceOwner:SpaceOwner__UpdateSpace`, event.args.space)
        return
    }

    try {
        const paused = await context.client.readContract({
            abi: SpaceFactory.abi,
            address: event.args.space,
            functionName: 'paused',
            args: [],
            blockNumber, // Use the latest block number
        })

        const spaceInfo = await context.client.readContract({
            abi: SpaceOwner.abi,
            address: SpaceOwner.address,
            functionName: 'getSpaceInfo',
            args: [event.args.space],
            blockNumber, // Use the latest block number
        })

        await context.db.sql
            .update(schema.space)
            .set({
                paused: paused,
                name: spaceInfo.name,
                uri: spaceInfo.uri,
                shortDescription: spaceInfo.shortDescription,
                longDescription: spaceInfo.longDescription,
            })
            .where(eq(schema.space.id, event.args.space))
    } catch (error) {
        console.error(
            `Error processing SpaceOwner:SpaceOwner__UpdateSpace at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('Space:SwapFeeConfigUpdated', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const spaceId = event.log.address

    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
    })
    if (!space) {
        console.warn(`Space not found for Space:SwapFeeConfigUpdated`, spaceId)
        return
    }
    try {
        // update swap fee table
        const result = await context.db.sql
            .update(schema.swapFee)
            .set({
                posterFeeBps: event.args.posterFeeBps,
                collectPosterFeeToSpace: event.args.collectPosterFeeToSpace,
                createdAt: blockNumber,
            })
            .where(eq(schema.swapFee.spaceId, spaceId))

        if (result.changes === 0) {
            // Insert a new record if it doesn't exist
            await context.db.insert(schema.swapFee).values({
                spaceId: spaceId,
                posterFeeBps: event.args.posterFeeBps,
                collectPosterFeeToSpace: event.args.collectPosterFeeToSpace,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(
            `Error processing Space:SwapFeeConfigUpdated at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('Space:SwapExecuted', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const blockTimestamp = event.block.timestamp
    const spaceId = event.log.address
    const transactionHash = event.transaction.hash

    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
    })
    if (!space) {
        console.warn(`Space not found for Space:Swap`, spaceId)
        return
    }

    try {
        const existing = await context.db.sql.query.swap.findFirst({
            where: eq(schema.swap.txHash, transactionHash),
        })
        if (!existing) {
            const createdDate = getCreatedDate(blockTimestamp)
            await context.db.insert(schema.swap).values({
                txHash: transactionHash,
                spaceId: spaceId,
                recipient: event.args.recipient,
                tokenIn: event.args.tokenIn,
                tokenOut: event.args.tokenOut,
                amountIn: event.args.amountIn,
                amountOut: event.args.amountOut,
                poster: event.args.poster,
                createdDate: createdDate,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(`Error processing Space:Swap at blockNumber ${blockNumber}:`, error)
    }
})
ponder.on('SwapRouter:Swap', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const blockTimestamp = event.block.timestamp
    const transactionHash = event.transaction.hash

    try {
        // update swap router swap table
        const existing = await context.db.sql.query.swapRouterSwap.findFirst({
            where: eq(schema.swapRouterSwap.txHash, transactionHash),
        })
        if (!existing) {
            const createdDate = getCreatedDate(blockTimestamp)
            await context.db.insert(schema.swapRouterSwap).values({
                txHash: transactionHash,
                router: event.args.router,
                caller: event.args.caller,
                tokenIn: event.args.tokenIn,
                tokenOut: event.args.tokenOut,
                amountIn: event.args.amountIn,
                amountOut: event.args.amountOut,
                recipient: event.args.recipient,
                createdDate: createdDate,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(`Error processing SwapRouter:Swap at blockNumber ${blockNumber}:`, error)
    }
})

ponder.on('SwapRouter:FeeDistribution', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const transactionHash = event.transaction.hash

    try {
        // update fee distribution table
        const existing = await context.db.sql.query.feeDistribution.findFirst({
            where: eq(schema.feeDistribution.txHash, transactionHash),
        })
        if (!existing) {
            await context.db.insert(schema.feeDistribution).values({
                txHash: transactionHash,
                token: event.args.token,
                treasury: event.args.treasury,
                poster: event.args.poster,
                treasuryAmount: event.args.treasuryAmount,
                posterAmount: event.args.posterAmount,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(
            `Error processing SwapRouter:FeeDistribution at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('SwapRouter:SwapRouterInitialized', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const transactionHash = event.transaction.hash

    try {
        // update swap router onchainTable
        const existing = await context.db.sql.query.swapRouter.findFirst({
            where: eq(schema.swapRouter.txHash, transactionHash),
        })
        if (!existing) {
            await context.db.insert(schema.swapRouter).values({
                txHash: transactionHash,
                spaceFactory: event.args.spaceFactory,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(
            `Error processing SwapRouter:SwapRouterInitialized at blockNumber ${blockNumber}:`,
            error,
        )
    }
})
