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

ponder.on('SpaceFactory:SpaceCreated', async ({ event, context }) => {
    // Get latest block number
    const blockNumber = await getLatestBlockNumber()
    const { SpaceFactory, SpaceOwner } = context.contracts

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
